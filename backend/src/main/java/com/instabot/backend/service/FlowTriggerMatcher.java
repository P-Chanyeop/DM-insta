package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.Flow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Flow 엔티티의 flowData JSON 에서 트리거 노드 정보를 꺼내
 * 들어온 Webhook 이벤트가 해당 Flow 를 발동시키는지 판정.
 *
 * Automation 테이블과 상관없이 Flow 단독으로 dispatch 가 가능하게 만드는
 * 매칭 레이어. ManyChat 의 "Flow = Automation" 통합 구조로 수렴하기 위한 첫 단계.
 *
 * 매칭 규칙 (NodeEditor 의 선택지와 1:1 매핑):
 *  - keywordMatch == "ANY"      → 모든 메시지 매칭 (키워드 무시)
 *  - keywordMatch == "EXACT"    → 소문자 정규화 후 완전 일치 (콤마로 OR)
 *  - keywordMatch == "CONTAINS" → 부분 문자열 포함 (콤마로 OR, 기본)
 *  - keywordMatch == "STARTS_WITH" → 접두 일치
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowTriggerMatcher {

    private final ObjectMapper objectMapper;

    /**
     * Flow 가 주어진 입력 텍스트로 발동되는지 판정.
     * 싱글톤 트리거(WELCOME/STORY_MENTION/ICEBREAKER)도 안전하게 true 를 반환하도록
     * 키워드가 비어 있거나 ANY 인 경우 무조건 매칭 처리.
     */
    public boolean matches(Flow flow, String inboundText) {
        return matches(flow, inboundText, null);
    }

    /**
     * COMMENT 트리거 용: postId 필터도 같이 체크.
     * postId 가 null 이면 post 필터 무시(일반 DM/STORY 경로에서 호출 가능).
     */
    public boolean matches(Flow flow, String inboundText, String postId) {
        JsonNode triggerData = extractTriggerData(flow);
        if (triggerData == null) return false;

        // COMMENT 전용: postTarget 필터 먼저
        if (postId != null && flow.getTriggerType() == Flow.TriggerType.COMMENT) {
            String postTarget = triggerData.path("postTarget").asText("any");
            String targetPostId = triggerData.path("postId").asText("");
            if (!"any".equalsIgnoreCase(postTarget) && !targetPostId.isBlank()
                    && !targetPostId.equals(postId)) {
                log.info("COMMENT post 필터 불일치 — flowId={}, flow.postId={}, webhook.mediaId={}",
                        flow.getId(), targetPostId, postId);
                return false;
            }
            log.info("COMMENT post 필터 매칭 — flowId={}, postTarget={}, targetPostId={}, webhook.mediaId={}",
                    flow.getId(), postTarget, targetPostId, postId);
        }

        String matchMode = triggerData.path("keywordMatch").asText("CONTAINS").toUpperCase();
        String keywords = triggerData.path("keywords").asText("");

        // ANY: 모든 입력 매칭
        if ("ANY".equals(matchMode)) return true;

        // 키워드 없음: 싱글톤 트리거(WELCOME 등)는 애초에 키워드가 필요 없어서 true,
        // 그 외는 검증 단계에서 활성화가 막혔어야 하므로 여기 오면 매칭 실패 처리.
        if (keywords.isBlank()) {
            return isSingletonTrigger(flow.getTriggerType());
        }

        String lowerText = inboundText == null ? "" : inboundText.toLowerCase();
        String[] parts = keywords.split(",");
        for (String raw : parts) {
            String kw = raw.trim().toLowerCase();
            if (kw.isEmpty()) continue;
            boolean hit = switch (matchMode) {
                case "EXACT" -> lowerText.equals(kw);
                case "STARTS_WITH" -> lowerText.startsWith(kw);
                default -> lowerText.contains(kw); // CONTAINS (기본)
            };
            if (hit) return true;
        }

        // Exclude keywords: 어떤 하나라도 포함되면 매칭 실패 (스팸 필터 용도)
        String exclude = triggerData.path("excludeKeywords").asText("");
        if (!exclude.isBlank()) {
            for (String raw : exclude.split(",")) {
                String kw = raw.trim().toLowerCase();
                if (!kw.isEmpty() && lowerText.contains(kw)) {
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * flowData JSON 에서 type==trigger 인 노드의 data 블록을 꺼낸다. 없으면 null.
     * v2 그래프만 지원 — v1 (레거시) 플로우는 Automation 경로로만 발동됨 (기존 Automation 레코드가 이미 있을 것).
     */
    public JsonNode extractTriggerData(Flow flow) {
        String flowDataJson = flow.getFlowData();
        if (flowDataJson == null || flowDataJson.isBlank()) return null;

        try {
            JsonNode root = objectMapper.readTree(flowDataJson);
            int version = root.path("version").asInt(1);
            if (version < 2) return null; // v1 은 Automation 경로가 담당

            JsonNode nodes = root.path("nodes");
            if (!nodes.isArray()) return null;

            for (JsonNode n : nodes) {
                if ("trigger".equals(n.path("type").asText())) {
                    return n.path("data");
                }
            }
            return null;
        } catch (Exception e) {
            log.warn("flowData 파싱 실패: flowId={}, err={}", flow.getId(), e.getMessage());
            return null;
        }
    }

    private boolean isSingletonTrigger(Flow.TriggerType type) {
        return type == Flow.TriggerType.WELCOME
                || type == Flow.TriggerType.STORY_MENTION
                || type == Flow.TriggerType.ICEBREAKER;
    }
}
