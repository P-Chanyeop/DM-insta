package com.instabot.backend.dto.flow;

import com.instabot.backend.service.flow.FlowGraphParser;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class FlowGraphParserTest {

    // ── v2 파싱 ──

    @Test
    void parseV2_basic() {
        String json = """
                {
                  "version": 2,
                  "nodes": [
                    {"id": "t1", "type": "trigger", "data": {"type": "comment"}},
                    {"id": "m1", "type": "message", "data": {"message": "hello"}}
                  ],
                  "edges": [
                    {"id": "e1", "source": "t1", "target": "m1"}
                  ]
                }
                """;
        FlowGraph graph = FlowGraphParser.parse(json);

        assertThat(graph.getTriggerNodeId()).isEqualTo("t1");
        assertThat(graph.getNodesById()).hasSize(2);
        assertThat(graph.getOutgoingEdges()).containsKey("t1");
        assertThat(graph.chooseNext("t1", null)).isEqualTo("m1");
    }

    @Test
    void parseV2_branching() {
        String json = """
                {
                  "version": 2,
                  "nodes": [
                    {"id": "t1", "type": "trigger", "data": {}},
                    {"id": "fc1", "type": "followCheck", "data": {}},
                    {"id": "m1", "type": "message", "data": {"message": "pass"}},
                    {"id": "m2", "type": "message", "data": {"message": "fail"}}
                  ],
                  "edges": [
                    {"id": "e1", "source": "t1", "target": "fc1"},
                    {"id": "e2", "source": "fc1", "target": "m1", "sourceHandle": "pass"},
                    {"id": "e3", "source": "fc1", "target": "m2", "sourceHandle": "fail"}
                  ]
                }
                """;
        FlowGraph graph = FlowGraphParser.parse(json);

        assertThat(graph.chooseNext("fc1", "pass")).isEqualTo("m1");
        assertThat(graph.chooseNext("fc1", "fail")).isEqualTo("m2");
    }

    @Test
    void parseV2_noEdges_returnsNull() {
        String json = """
                {
                  "version": 2,
                  "nodes": [{"id": "t1", "type": "trigger", "data": {}}],
                  "edges": []
                }
                """;
        FlowGraph graph = FlowGraphParser.parse(json);
        assertThat(graph.chooseNext("t1", null)).isNull();
    }

    // ── v1 변환 ──

    @Test
    void parseV1_linearChain() {
        String json = """
                {
                  "trigger": {"type": "comment", "keywords": ["hi"]},
                  "commentReply": {"enabled": true, "replies": ["thanks"]},
                  "openingDm": {"enabled": true, "message": "hello", "buttonText": "click"},
                  "mainDm": {"message": "main msg"}
                }
                """;
        FlowGraph graph = FlowGraphParser.parse(json);

        assertThat(graph.getTriggerNodeId()).isEqualTo("trigger-1");
        // trigger → commentReply → openingDm → mainDm
        assertThat(graph.chooseNext("trigger-1", null)).isEqualTo("commentReply-1");
        assertThat(graph.chooseNext("commentReply-1", null)).isEqualTo("openingDm-1");
    }

    @Test
    void parseV1_withRequirements() {
        String json = """
                {
                  "trigger": {"type": "comment"},
                  "requirements": {
                    "followCheck": {"enabled": true, "message": "follow plz"},
                    "emailCollection": {"enabled": true, "message": "email plz"}
                  },
                  "mainDm": {"message": "done"}
                }
                """;
        FlowGraph graph = FlowGraphParser.parse(json);

        assertThat(graph.getNode("followCheck-1")).isNotNull();
        assertThat(graph.getNode("emailCollection-1")).isNotNull();
        // emailCollection connects via "pass" handle
        assertThat(graph.chooseNext("followCheck-1", "pass")).isEqualTo("emailCollection-1");
    }

    // ── 에러 ──

    @Test
    void parse_invalidJson_throws() {
        assertThatThrownBy(() -> FlowGraphParser.parse("{invalid"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("파싱 실패");
    }
}
