package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.dto.TemplateDto;
import com.instabot.backend.entity.Automation;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.Template;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.AutomationRepository;
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
    private final AutomationRepository automationRepository;
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
     * 템플릿 "사용하기" — 템플릿의 flowData를 복사해서 새 Flow 생성 + 매칭 Automation(트리거) 연결.
     * <p>
     * 핵심: 템플릿 flowData 의 {@code trigger.type} / {@code trigger.keywords} / {@code trigger.matchType}
     * 를 파싱해서 해당 Flow 가 즉시 동작 가능한 상태(트리거까지 연결된 상태)로 만든다.
     * <p>
     * 쿼터 검증은 실제 엔티티 생성 전에 한 번에 수행하여 한쪽만 생성되는 상황을 예방한다.
     */
    @Transactional
    public FlowDto.Response useTemplate(Long templateId, Long userId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("템플릿을 찾을 수 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // flowData 파싱 — 트리거 타입/키워드/매치타입/대상 게시물 추출
        ParsedTrigger parsed = parseTrigger(template.getFlowData());

        // 플로우 + 자동화(트리거) 할당량 둘 다 먼저 검증 — 하나만 생성되는 상황 예방
        quotaService.checkFlowQuota(user);
        quotaService.checkAutomationQuota(user);

        // 1) Flow 생성 (active=true + PUBLISHED 로 즉시 동작 가능하게)
        Flow flow = Flow.builder()
                .user(user)
                .name(template.getName() + " (템플릿)")
                .flowData(template.getFlowData())
                .triggerType(parsed.flowTriggerType)
                .status(Flow.FlowStatus.PUBLISHED)
                .active(true)
                .build();
        flow = flowRepository.save(flow);

        // 2) 매칭 Automation 생성 (Flow 에 연결, 키워드/매치타입/대상 게시물 자동 채움)
        Automation automation = Automation.builder()
                .user(user)
                .flow(flow)
                .name(template.getName() + " 트리거")
                .type(parsed.automationType)
                .keyword(parsed.joinedKeywords)
                .matchType(parsed.matchType)
                .postId(parsed.postId)
                .active(true)
                .build();
        automationRepository.save(automation);

        // 3) 템플릿 사용 횟수 증가
        template.setUsageCount(template.getUsageCount() + 1);
        templateRepository.save(template);

        log.info("템플릿 사용 완료 — user={}, template={}, flow={}, automation={}, type={}, keywords={}",
                userId, template.getName(), flow.getId(), automation.getId(),
                parsed.automationType, parsed.joinedKeywords);

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
     * 예시: {@code {"trigger":{"type":"comment","keywords":["가격","얼마"],"matchType":"CONTAINS","postTarget":"any"}}}
     */
    private ParsedTrigger parseTrigger(String flowDataJson) {
        ParsedTrigger result = new ParsedTrigger();
        result.flowTriggerType = Flow.TriggerType.KEYWORD;
        result.automationType = Automation.AutomationType.DM_KEYWORD;
        result.matchType = Automation.MatchType.CONTAINS;
        result.joinedKeywords = null;
        result.postId = null;

        if (flowDataJson == null || flowDataJson.isBlank()) return result;

        try {
            JsonNode root = OBJECT_MAPPER.readTree(flowDataJson);
            JsonNode trigger = root.path("trigger");
            if (trigger.isMissingNode() || !trigger.isObject()) return result;

            // 트리거 타입 매핑 — comment → COMMENT_TRIGGER, dm_keyword(또는 keyword) → DM_KEYWORD
            String triggerTypeStr = trigger.path("type").asText("").trim().toLowerCase();
            switch (triggerTypeStr) {
                case "comment" -> {
                    result.flowTriggerType = Flow.TriggerType.COMMENT;
                    result.automationType = Automation.AutomationType.COMMENT_TRIGGER;
                }
                case "story_mention" -> {
                    result.flowTriggerType = Flow.TriggerType.STORY_MENTION;
                    result.automationType = Automation.AutomationType.STORY_MENTION;
                }
                case "story_reply" -> {
                    result.flowTriggerType = Flow.TriggerType.STORY_REPLY;
                    result.automationType = Automation.AutomationType.STORY_REPLY;
                }
                case "welcome" -> {
                    result.flowTriggerType = Flow.TriggerType.WELCOME;
                    result.automationType = Automation.AutomationType.WELCOME_MESSAGE;
                }
                case "icebreaker" -> {
                    result.flowTriggerType = Flow.TriggerType.ICEBREAKER;
                    result.automationType = Automation.AutomationType.ICEBREAKER;
                }
                default -> {
                    // "dm_keyword", "keyword", 빈값 → DM_KEYWORD
                    result.flowTriggerType = Flow.TriggerType.KEYWORD;
                    result.automationType = Automation.AutomationType.DM_KEYWORD;
                }
            }

            // 키워드 추출 — array 를 콤마로 join (WebhookEventService.matchesAutomationKeyword 가 콤마 split 처리)
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

            // 매치 타입
            String matchTypeStr = trigger.path("matchType").asText("").trim().toUpperCase();
            if (!matchTypeStr.isBlank()) {
                try {
                    result.matchType = Automation.MatchType.valueOf(matchTypeStr);
                } catch (IllegalArgumentException ignored) {
                    // CONTAINS 유지
                }
            }

            // 대상 게시물 — "any" 면 null(전체 게시물), 아니면 그대로 postId 로 저장
            String postTarget = trigger.path("postTarget").asText("").trim();
            if (!postTarget.isBlank() && !"any".equalsIgnoreCase(postTarget)) {
                result.postId = postTarget;
            }

        } catch (Exception e) {
            log.warn("템플릿 flowData 파싱 실패 — 기본값(DM_KEYWORD/CONTAINS) 사용: {}", e.getMessage());
        }

        return result;
    }

    private static class ParsedTrigger {
        Flow.TriggerType flowTriggerType;
        Automation.AutomationType automationType;
        Automation.MatchType matchType;
        String joinedKeywords;
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
