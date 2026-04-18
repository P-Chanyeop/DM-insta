package com.instabot.backend.dto.flow;

import lombok.Getter;

import java.util.*;

/**
 * 파싱된 플로우 그래프 — 노드/엣지 조회 및 순회 지원
 */
@Getter
public class FlowGraph {

    private final Map<String, FlowNode> nodesById;
    private final Map<String, List<FlowEdge>> outgoingEdges; // sourceId -> edges
    private final String triggerNodeId;

    public FlowGraph(List<FlowNode> nodes, List<FlowEdge> edges) {
        this.nodesById = new LinkedHashMap<>();
        this.outgoingEdges = new HashMap<>();

        for (FlowNode n : nodes) {
            nodesById.put(n.getId(), n);
        }

        for (FlowEdge e : edges) {
            outgoingEdges.computeIfAbsent(e.getSource(), k -> new ArrayList<>()).add(e);
        }

        // 트리거 노드 탐색
        this.triggerNodeId = nodes.stream()
                .filter(n -> "trigger".equals(n.getType()))
                .map(FlowNode::getId)
                .findFirst()
                .orElse(null);
    }

    public FlowNode getNode(String id) {
        return nodesById.get(id);
    }

    /**
     * 현재 노드에서 branch에 따라 다음 노드 ID 선택.
     *
     * 1. branch가 non-null이면 sourceHandle이 일치하는 엣지 선택
     * 2. 일치 없으면 sourceHandle이 null/빈 문자열인 기본 엣지 선택
     * 3. 엣지 없으면 null (플로우 종료)
     */
    public String chooseNext(String currentNodeId, String branch) {
        List<FlowEdge> outs = outgoingEdges.get(currentNodeId);
        if (outs == null || outs.isEmpty()) return null;

        // branch 매칭
        if (branch != null) {
            for (FlowEdge e : outs) {
                if (branch.equals(e.getSourceHandle())) {
                    return e.getTarget();
                }
            }
        }

        // 기본 엣지 (sourceHandle 없는 것)
        for (FlowEdge e : outs) {
            if (e.getSourceHandle() == null || e.getSourceHandle().isEmpty()) {
                return e.getTarget();
            }
        }

        // 매칭 엣지 없으면 플로우 종료 (잘못된 분기로 라우팅 방지)
        return null;
    }
}
