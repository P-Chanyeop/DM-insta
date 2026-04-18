package com.instabot.backend.service.flow.executor;

import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.flow.NodeExecutor;
import org.springframework.stereotype.Component;

/**
 * 트리거 노드 — 플로우 진입점. 실행 로직 없이 통과만 한다.
 */
@Component
public class TriggerNodeExecutor implements NodeExecutor {

    @Override
    public String[] supportedTypes() {
        return new String[]{"trigger"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        return NodeExecResult.ok();
    }
}
