package com.instabot.backend.service.flow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.instabot.backend.dto.flow.FlowEdge;
import com.instabot.backend.dto.flow.FlowGraph;
import com.instabot.backend.dto.flow.FlowNode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

/**
 * flowData JSON → FlowGraph 파서.
 * v2(nodes/edges 배열)를 직접 파싱하고,
 * v1(고정 슬롯)은 선형 그래프로 변환한다.
 */
@Slf4j
public class FlowGraphParser {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static FlowGraph parse(String flowDataJson) {
        try {
            JsonNode root = mapper.readTree(flowDataJson);
            int version = root.path("version").asInt(1);
            if (version >= 2) {
                return parseV2(root);
            } else {
                return convertV1ToGraph(root);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("flowData 파싱 실패: " + e.getMessage(), e);
        }
    }

    /**
     * v2: nodes[], edges[] 배열을 직접 파싱
     */
    private static FlowGraph parseV2(JsonNode root) {
        List<FlowNode> nodes = new ArrayList<>();
        List<FlowEdge> edges = new ArrayList<>();

        JsonNode nodesArr = root.path("nodes");
        if (nodesArr.isArray()) {
            for (JsonNode n : nodesArr) {
                nodes.add(FlowNode.builder()
                        .id(n.path("id").asText())
                        .type(n.path("type").asText())
                        .data(n.path("data"))
                        .build());
            }
        }

        JsonNode edgesArr = root.path("edges");
        if (edgesArr.isArray()) {
            for (JsonNode e : edgesArr) {
                edges.add(FlowEdge.builder()
                        .id(e.path("id").asText())
                        .source(e.path("source").asText())
                        .target(e.path("target").asText())
                        .sourceHandle(e.has("sourceHandle") ? e.path("sourceHandle").asText() : null)
                        .build());
            }
        }

        return new FlowGraph(nodes, edges);
    }

    /**
     * v1: 고정 슬롯 JSON → 선형 노드 체인으로 변환.
     * 기존 FlowExecutionService의 실행 순서를 재현한다.
     */
    private static FlowGraph convertV1ToGraph(JsonNode root) {
        List<FlowNode> nodes = new ArrayList<>();
        List<FlowEdge> edges = new ArrayList<>();
        String prevId = null;
        int edgeIdx = 0;

        // 1. 트리거
        String triggerId = "trigger-1";
        nodes.add(makeNode(triggerId, "trigger", root.path("trigger")));
        prevId = triggerId;

        // 2. 댓글 답장
        if (isEnabled(root.path("commentReply"))) {
            String id = "commentReply-1";
            nodes.add(makeNode(id, "commentReply", root.path("commentReply")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            prevId = id;
        }

        // 3. 오프닝 DM
        if (isEnabled(root.path("openingDm"))) {
            String id = "openingDm-1";
            nodes.add(makeNode(id, "openingDm", root.path("openingDm")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            prevId = id;
        }

        // 4. 팔로우 확인
        JsonNode requirements = root.path("requirements");
        if (isEnabled(requirements.path("followCheck"))) {
            String id = "followCheck-1";
            nodes.add(makeNode(id, "followCheck", requirements.path("followCheck")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            // pass 엣지만 (fail → 플로우 종료 = 기존 동작)
            prevId = id;
        }

        // 5. 이메일 수집
        if (isEnabled(requirements.path("emailCollection"))) {
            String id = "emailCollection-1";
            nodes.add(makeNode(id, "emailCollection", requirements.path("emailCollection")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, "pass"));
            prevId = id;
        }

        // 6. 조건들
        JsonNode conditions = root.path("conditions");
        if (conditions.isArray()) {
            for (int i = 0; i < conditions.size(); i++) {
                JsonNode cond = conditions.get(i);
                if (!cond.path("enabled").asBoolean(false)) continue;
                String id = "condition-" + (i + 1);
                nodes.add(makeNode(id, "condition", cond));
                edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, "pass"));
                prevId = id;
            }
        }

        // 7. 재고 확인
        if (isEnabled(root.path("inventory"))) {
            String id = "inventory-1";
            nodes.add(makeNode(id, "inventory", root.path("inventory")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, "pass"));
            prevId = id;
        }

        // 8. A/B 테스트
        if (isEnabled(root.path("abtest"))) {
            String id = "abtest-1";
            nodes.add(makeNode(id, "abtest", root.path("abtest")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, "pass"));
            prevId = id;
        }

        // 9. 메인 DM
        if (root.has("mainDm")) {
            String id = "mainDm-1";
            nodes.add(makeNode(id, "message", root.path("mainDm")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, "pass"));
            prevId = id;
        }

        // 10. 캐러셀
        if (isEnabled(root.path("carousel"))) {
            String id = "carousel-1";
            nodes.add(makeNode(id, "carousel", root.path("carousel")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            prevId = id;
        }

        // 11. AI 응답
        if (isEnabled(root.path("aiResponse"))) {
            String id = "aiResponse-1";
            nodes.add(makeNode(id, "aiResponse", root.path("aiResponse")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            prevId = id;
        }

        // 12. 옵트인
        if (isEnabled(root.path("optIn"))) {
            String id = "optIn-1";
            nodes.add(makeNode(id, "optIn", root.path("optIn")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            prevId = id;
        }

        // 13. 카카오
        if (isEnabled(root.path("kakao"))) {
            String id = "kakao-1";
            nodes.add(makeNode(id, "kakao", root.path("kakao")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, id, null));
            prevId = id;
        }

        // 14. 팔로업 (delay + message)
        if (isEnabled(root.path("followUp"))) {
            String delayId = "delay-1";
            nodes.add(makeNode(delayId, "delay", root.path("followUp")));
            edges.add(makeEdge("ve" + (edgeIdx++), prevId, delayId, null));

            String followUpId = "followUp-1";
            nodes.add(makeNode(followUpId, "message", root.path("followUp")));
            edges.add(makeEdge("ve" + (edgeIdx++), delayId, followUpId, null));
        }

        return new FlowGraph(nodes, edges);
    }

    private static boolean isEnabled(JsonNode node) {
        if (node == null || node.isMissingNode()) return false;
        return node.path("enabled").asBoolean(false);
    }

    private static FlowNode makeNode(String id, String type, JsonNode data) {
        return FlowNode.builder().id(id).type(type).data(data).build();
    }

    private static FlowEdge makeEdge(String id, String source, String target, String sourceHandle) {
        return FlowEdge.builder().id(id).source(source).target(target).sourceHandle(sourceHandle).build();
    }
}
