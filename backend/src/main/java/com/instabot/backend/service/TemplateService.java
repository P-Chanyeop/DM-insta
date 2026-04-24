package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.dto.TemplateDto;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.Template;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.TemplateRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final FlowRepository flowRepository;
    private final UserRepository userRepository;
    private final QuotaService quotaService;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public List<TemplateDto.Response> getTemplates(String category) {
        List<Template> templates;
        if (category != null && !category.isBlank() && !category.equals("전체")) {
            templates = templateRepository.findByCategoryAndIsPublicTrueOrderByUsageCountDesc(category);
        } else {
            templates = templateRepository.findByIsPublicTrueOrderByUsageCountDesc();
        }
        return templates.stream().map(this::toResponse).toList();
    }

    @Transactional
    public void incrementUsage(Long id) {
        Template t = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("템플릿을 찾을 수 없습니다."));
        t.setUsageCount(t.getUsageCount() + 1);
        templateRepository.save(t);
    }

    /**
     * 템플릿 "사용하기" — 템플릿의 flowData 를 복사해 새 Flow 생성.
     * <p>
     * Phase 3: Automation 이 제거되어 트리거 매칭 정보는 flowData 의 v2 트리거 노드에 임베드됨.
     * 템플릿이 레거시 v1 포맷({@code root.trigger}) 이면 트리거 노드로 승격 후 저장.
     */
    @Transactional
    public FlowDto.Response useTemplate(Long templateId, Long userId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("템플릿을 찾을 수 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        quotaService.checkFlowQuota(user);

        ParsedTrigger parsed = parseTrigger(template.getFlowData());
        String upgradedFlowData = upgradeToV2(template.getFlowData(), parsed);

        Flow flow = Flow.builder()
                .user(user)
                .name(template.getName() + " (템플릿)")
                .flowData(upgradedFlowData)
                .triggerType(parsed.flowTriggerType)
                .status(Flow.FlowStatus.PUBLISHED)
                .active(true)
                .build();
        flow = flowRepository.save(flow);

        template.setUsageCount(template.getUsageCount() + 1);
        templateRepository.save(template);

        log.info("템플릿 사용 완료 — user={}, template={}, flow={}, type={}, keywords={}",
                userId, template.getName(), flow.getId(),
                parsed.flowTriggerType, parsed.joinedKeywords);

        return FlowDto.Response.builder()
                .id(flow.getId())
                .name(flow.getName())
                .triggerType(flow.getTriggerType().name())
                .status(flow.getStatus().name())
                .active(flow.isActive())
                .flowData(flow.getFlowData())
                .createdAt(flow.getCreatedAt())
                .build();
    }

    /**
     * 템플릿 flowData JSON 에서 트리거 설정을 추출.
     * <p>
     * 레거시 v1 예시: {@code {"trigger":{"type":"comment","keywords":["가격","얼마"],"matchType":"CONTAINS","postTarget":"any"}}}
     */
    private ParsedTrigger parseTrigger(String flowDataJson) {
        ParsedTrigger result = new ParsedTrigger();
        result.flowTriggerType = Flow.TriggerType.KEYWORD;
        result.keywordMatch = "CONTAINS";
        result.joinedKeywords = "";
        result.postTarget = "any";
        result.postId = null;

        if (flowDataJson == null || flowDataJson.isBlank()) return result;

        try {
            JsonNode root = OBJECT_MAPPER.readTree(flowDataJson);
            JsonNode trigger = root.path("trigger");
            if (trigger.isMissingNode() || !trigger.isObject()) return result;

            // 트리거 타입
            String triggerTypeStr = trigger.path("type").asText("").trim().toLowerCase();
            result.flowTriggerType = switch (triggerTypeStr) {
                case "comment" -> Flow.TriggerType.COMMENT;
                case "story_mention" -> Flow.TriggerType.STORY_MENTION;
                case "story_reply" -> Flow.TriggerType.STORY_REPLY;
                case "welcome" -> Flow.TriggerType.WELCOME;
                case "icebreaker" -> Flow.TriggerType.ICEBREAKER;
                default -> Flow.TriggerType.KEYWORD;
            };

            // 키워드 — array 를 콤마로 join (FlowTriggerMatcher 가 콤마 split 처리)
            JsonNode keywords = trigger.path("keywords");
            if (keywords.isArray() && keywords.size() > 0) {
                List<String> list = new ArrayList<>();
                keywords.forEach(k -> {
                    String kw = k.asText("").trim();
                    if (!kw.isBlank()) list.add(kw);
                });
                if (!list.isEmpty()) {
                    result.joinedKeywords = String.join(",", list);
                }
            }

            // 매치 모드
            String matchTypeStr = trigger.path("matchType").asText("").trim().toUpperCase();
            if (!matchTypeStr.isBlank()) {
                result.keywordMatch = matchTypeStr;
            }

            // 대상 게시물
            String postTarget = trigger.path("postTarget").asText("").trim();
            if (!postTarget.isBlank() && !"any".equalsIgnoreCase(postTarget)) {
                result.postTarget = "specific";
                result.postId = postTarget;
            }

        } catch (Exception e) {
            log.warn("템플릿 flowData 파싱 실패 — 기본값 사용: {}", e.getMessage());
        }

        return result;
    }

    /**
     * 템플릿 flowData 를 v2 포맷으로 업그레이드 — FlowTriggerMatcher 가 읽을 수 있도록 트리거 노드 합성.
     * 이미 v2 트리거 노드가 있으면 그대로 반환.
     */
    private String upgradeToV2(String flowDataJson, ParsedTrigger parsed) {
        try {
            ObjectNode root;
            if (flowDataJson == null || flowDataJson.isBlank()) {
                root = OBJECT_MAPPER.createObjectNode();
            } else {
                JsonNode parsedNode = OBJECT_MAPPER.readTree(flowDataJson);
                if (!(parsedNode instanceof ObjectNode)) {
                    return flowDataJson;
                }
                root = (ObjectNode) parsedNode;
            }

            ArrayNode nodes = (root.has("nodes") && root.get("nodes").isArray())
                    ? (ArrayNode) root.get("nodes")
                    : OBJECT_MAPPER.createArrayNode();

            boolean hasTriggerNode = false;
            for (JsonNode n : nodes) {
                if ("trigger".equals(n.path("type").asText())) {
                    hasTriggerNode = true;
                    break;
                }
            }

            if (!hasTriggerNode) {
                ObjectNode triggerData = OBJECT_MAPPER.createObjectNode();
                triggerData.put("keywordMatch", parsed.keywordMatch);
                triggerData.put("keywords", parsed.joinedKeywords);
                triggerData.put("postTarget", parsed.postTarget);
                if (parsed.postId != null) triggerData.put("postId", parsed.postId);

                ObjectNode triggerNode = OBJECT_MAPPER.createObjectNode();
                triggerNode.put("id", "trigger-template");
                triggerNode.put("type", "trigger");
                triggerNode.set("data", triggerData);

                ArrayNode newNodes = OBJECT_MAPPER.createArrayNode();
                newNodes.add(triggerNode);
                nodes.forEach(newNodes::add);
                root.set("nodes", newNodes);
            }

            root.put("version", 2);
            return OBJECT_MAPPER.writeValueAsString(root);
        } catch (Exception e) {
            log.warn("템플릿 flowData v2 업그레이드 실패 — 원본 유지: {}", e.getMessage());
            return flowDataJson;
        }
    }

    private static class ParsedTrigger {
        Flow.TriggerType flowTriggerType;
        String keywordMatch;   // "CONTAINS" | "EXACT" | "STARTS_WITH" | "ANY"
        String joinedKeywords; // 콤마 구분
        String postTarget;     // "any" | "specific"
        String postId;
    }

    private TemplateDto.Response toResponse(Template t) {
        return TemplateDto.Response.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .category(t.getCategory())
                .flowData(t.getFlowData())
                .icon(t.getIcon())
                .gradientColors(t.getGradientColors())
                .previewImageUrl(t.getPreviewImageUrl())
                .usageCount(t.getUsageCount())
                .rating(t.getRating())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
