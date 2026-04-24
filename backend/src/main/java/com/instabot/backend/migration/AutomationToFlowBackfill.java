package com.instabot.backend.migration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Phase 3 이전에는 Flow 발동이 Automation 레코드를 중간 레이어로 거쳤다.
 * v1 flowData 에는 트리거 노드가 없고 Automation 의 keyword/matchType/postId 로 매칭 → 실행만 Flow 에 위임.
 *
 * Phase 3 에서 Automation dispatch 를 제거하면 v1 Flow 는 FlowTriggerMatcher 가 매칭할 수 없어 조용히 죽는다.
 * 이 러너가 부팅 시 한번 훑어서, Automation 에 연결된 각 Flow 의 flowData 를 v2 로 업그레이드 — 트리거 노드를 합성해 넣고,
 * Flow.triggerType 을 Automation.type 에서 파생. 이미 v2 인 플로우는 건너뛰어 매 시작마다 돌려도 안전(idempotent).
 *
 * automations 테이블이 없는 환경(신규 설치) 에서는 조용히 스킵. Phase 4 에서 테이블이 drop 되면 이 파일도 제거.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Order(10) // 다른 대부분의 Runner 보다 먼저 돌리고 싶어서 낮은 order
public class AutomationToFlowBackfill implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!hasAutomationsTable()) {
            log.debug("automations 테이블 없음 — backfill 스킵");
            return;
        }

        List<Map<String, Object>> rows;
        try {
            rows = jdbcTemplate.queryForList(
                    "SELECT a.id AS automation_id, a.type, a.keyword, a.match_type, a.post_id, " +
                    "       f.id AS flow_id, f.flow_data " +
                    "FROM automations a " +
                    "INNER JOIN flows f ON f.id = a.flow_id");
        } catch (Exception e) {
            log.warn("automations 조회 실패 — backfill 스킵: {}", e.getMessage());
            return;
        }

        int upgraded = 0;
        int skipped = 0;

        for (Map<String, Object> row : rows) {
            Long flowId = ((Number) row.get("flow_id")).longValue();
            String autoType = (String) row.get("type");
            String keyword = (String) row.get("keyword");
            String matchType = (String) row.get("match_type");
            String postId = (String) row.get("post_id");
            String flowData = (String) row.get("flow_data");

            String newTriggerType = mapTriggerType(autoType);
            String newFlowData = upgradeFlowData(flowData, keyword, matchType, postId);

            if (newFlowData == null) {
                skipped++;
                continue;
            }

            jdbcTemplate.update(
                    "UPDATE flows SET flow_data=?, trigger_type=? WHERE id=?",
                    newFlowData, newTriggerType, flowId);
            upgraded++;
        }

        if (upgraded > 0 || skipped > 0) {
            log.info("Automation → Flow backfill 완료: upgraded={}, skipped={}", upgraded, skipped);
        }
    }

    private boolean hasAutomationsTable() {
        try {
            jdbcTemplate.queryForObject("SELECT COUNT(*) FROM automations", Integer.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String mapTriggerType(String autoType) {
        if (autoType == null) return "KEYWORD";
        return switch (autoType) {
            case "DM_KEYWORD" -> "KEYWORD";
            case "COMMENT_TRIGGER" -> "COMMENT";
            case "STORY_MENTION" -> "STORY_MENTION";
            case "STORY_REPLY" -> "STORY_REPLY";
            case "WELCOME_MESSAGE" -> "WELCOME";
            case "ICEBREAKER" -> "ICEBREAKER";
            default -> "KEYWORD";
        };
    }

    private String mapKeywordMatch(String matchType) {
        if (matchType == null) return "CONTAINS";
        return switch (matchType) {
            case "EXACT" -> "EXACT";
            case "STARTS_WITH" -> "STARTS_WITH";
            default -> "CONTAINS";
        };
    }

    /**
     * flowData JSON 에 트리거 노드를 합성해 넣고 version 을 2 로 올린다.
     * @return null 이면 업그레이드 불필요(이미 v2 트리거 있음) 또는 파싱 실패(스킵)
     */
    private String upgradeFlowData(String flowDataJson, String keyword, String matchType, String postId) {
        try {
            ObjectNode root;
            if (flowDataJson == null || flowDataJson.isBlank()) {
                root = objectMapper.createObjectNode();
            } else {
                JsonNode parsed = objectMapper.readTree(flowDataJson);
                if (!(parsed instanceof ObjectNode)) return null;
                root = (ObjectNode) parsed;
            }

            int version = root.path("version").asInt(1);
            ArrayNode nodes = (root.has("nodes") && root.get("nodes").isArray())
                    ? (ArrayNode) root.get("nodes")
                    : objectMapper.createArrayNode();

            // 이미 트리거 노드가 있으면 버전만 올리면 충분 (v2 이상이면 아예 건드리지 않음)
            for (JsonNode n : nodes) {
                if ("trigger".equals(n.path("type").asText())) {
                    if (version >= 2) return null; // 이미 완전 업그레이드
                    root.put("version", 2);
                    return objectMapper.writeValueAsString(root);
                }
            }

            // 트리거 노드 합성
            ObjectNode triggerData = objectMapper.createObjectNode();
            triggerData.put("keywordMatch", mapKeywordMatch(matchType));
            triggerData.put("keywords", keyword == null ? "" : keyword);
            boolean hasPost = postId != null && !postId.isBlank();
            triggerData.put("postTarget", hasPost ? "specific" : "any");
            if (hasPost) triggerData.put("postId", postId);

            ObjectNode triggerNode = objectMapper.createObjectNode();
            triggerNode.put("id", "trigger-backfill");
            triggerNode.put("type", "trigger");
            triggerNode.set("data", triggerData);

            ArrayNode newNodes = objectMapper.createArrayNode();
            newNodes.add(triggerNode);
            nodes.forEach(newNodes::add);

            root.set("nodes", newNodes);
            root.put("version", 2);

            // edges 는 손대지 않음 — 기존 연결은 유지

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            log.warn("flow_data 파싱 실패 — 스킵: flowId JSON={}", flowDataJson, e);
            return null;
        }
    }
}
