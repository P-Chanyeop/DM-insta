package com.instabot.backend.dto.flow;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class FlowGraphTraversalTest {

    private FlowNode node(String id, String type) {
        return FlowNode.builder().id(id).type(type).build();
    }

    private FlowEdge edge(String id, String source, String target, String sourceHandle) {
        return FlowEdge.builder().id(id).source(source).target(target).sourceHandle(sourceHandle).build();
    }

    // ── 선형 순회 ──

    @Test
    void linearTraversal() {
        FlowGraph graph = new FlowGraph(
                List.of(node("t", "trigger"), node("a", "message"), node("b", "message")),
                List.of(edge("e1", "t", "a", null), edge("e2", "a", "b", null))
        );

        assertThat(graph.getTriggerNodeId()).isEqualTo("t");
        assertThat(graph.chooseNext("t", null)).isEqualTo("a");
        assertThat(graph.chooseNext("a", null)).isEqualTo("b");
        assertThat(graph.chooseNext("b", null)).isNull(); // 종료
    }

    // ── 분기 선택 ──

    @Test
    void branchSelection_passFail() {
        FlowGraph graph = new FlowGraph(
                List.of(node("cond", "condition"), node("yes", "message"), node("no", "message")),
                List.of(
                        edge("e1", "cond", "yes", "pass"),
                        edge("e2", "cond", "no", "fail")
                )
        );

        assertThat(graph.chooseNext("cond", "pass")).isEqualTo("yes");
        assertThat(graph.chooseNext("cond", "fail")).isEqualTo("no");
    }

    @Test
    void branchSelection_fallbackToDefault() {
        FlowGraph graph = new FlowGraph(
                List.of(node("n", "trigger"), node("d", "message")),
                List.of(edge("e1", "n", "d", null))
        );

        // branch가 지정되었지만 매칭 엣지 없으면 기본(null handle) 엣지 사용
        assertThat(graph.chooseNext("n", "unknown_branch")).isEqualTo("d");
    }

    @Test
    void branchSelection_abTest() {
        FlowGraph graph = new FlowGraph(
                List.of(node("ab", "abtest"), node("a", "message"), node("b", "message")),
                List.of(
                        edge("e1", "ab", "a", "a"),
                        edge("e2", "ab", "b", "b")
                )
        );

        assertThat(graph.chooseNext("ab", "a")).isEqualTo("a");
        assertThat(graph.chooseNext("ab", "b")).isEqualTo("b");
    }

    // ── 엣지 케이스 ──

    @Test
    void noOutgoingEdges_returnsNull() {
        FlowGraph graph = new FlowGraph(
                List.of(node("t", "trigger")),
                List.of()
        );
        assertThat(graph.chooseNext("t", null)).isNull();
    }

    @Test
    void unknownNodeId_returnsNull() {
        FlowGraph graph = new FlowGraph(List.of(), List.of());
        assertThat(graph.chooseNext("nonexistent", null)).isNull();
        assertThat(graph.getNode("nonexistent")).isNull();
    }

    @Test
    void noTriggerNode_triggerIdIsNull() {
        FlowGraph graph = new FlowGraph(
                List.of(node("m1", "message")),
                List.of()
        );
        assertThat(graph.getTriggerNodeId()).isNull();
    }

    @Test
    void multipleEdges_firstMatchWins() {
        FlowGraph graph = new FlowGraph(
                List.of(node("s", "trigger"), node("a", "message"), node("b", "message")),
                List.of(
                        edge("e1", "s", "a", "pass"),
                        edge("e2", "s", "b", "pass")
                )
        );
        // 같은 sourceHandle이면 첫 번째 매칭
        assertThat(graph.chooseNext("s", "pass")).isEqualTo("a");
    }
}
