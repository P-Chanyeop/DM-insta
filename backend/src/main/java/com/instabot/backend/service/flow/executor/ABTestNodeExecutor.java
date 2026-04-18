package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.ABTestService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * A/B 테스트 노드 — "a" 또는 "b" 분기 반환
 */
@Component
@RequiredArgsConstructor
public class ABTestNodeExecutor implements NodeExecutor {

    private final ABTestService abTestService;

    @Override
    public String[] supportedTypes() {
        return new String[]{"abtest"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        String testName = data != null ? data.path("testName").asText("기본 테스트") : "기본 테스트";
        int variantA = data != null ? data.path("variantA").asInt(50) : 50;
        String variant = abTestService.assignVariant(ctx.getFlow().getId(), testName, variantA);
        ctx.getVariables().put("abVariant", variant);
        return NodeExecResult.branch(variant); // "a" or "b"
    }
}
