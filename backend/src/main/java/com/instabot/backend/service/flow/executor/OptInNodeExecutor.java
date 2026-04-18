package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.RecurringNotificationService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Recurring Notification 옵트인 요청 노드
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OptInNodeExecutor implements NodeExecutor {

    private final RecurringNotificationService recurringNotificationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"optIn"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        String topic = data.path("topic").asText("general");
        String topicLabel = data.path("topicLabel").asText("소식 알림");
        String message = utils.replaceVariables(
                data.path("message").asText("새 소식을 받아보시겠어요?"), ctx);
        String frequency = data.path("frequency").asText("WEEKLY");

        try {
            recurringNotificationService.requestOptIn(
                    ctx.getIgAccount(), ctx.getSenderIgId(), message, topic, topicLabel, frequency);
        } catch (Exception e) {
            log.error("OptIn 요청 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
