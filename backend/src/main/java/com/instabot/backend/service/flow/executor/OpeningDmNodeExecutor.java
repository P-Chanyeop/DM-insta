package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 오프닝 DM 노드 — 첫 DM 발송 + 버튼 있으면 postback 대기
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpeningDmNodeExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"openingDm"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null || !data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

        String message = utils.replaceVariables(data.path("message").asText(""), ctx);
        String buttonText = data.path("buttonText").asText("");
        if (message.isBlank()) return NodeExecResult.ok();

        try {
            if (!buttonText.isBlank()) {
                List<Map<String, String>> quickReplies = List.of(
                        Map.of("title", buttonText, "payload", "OPENING_DM_CLICKED")
                );
                instagramApiService.sendQuickReplyMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, quickReplies, ctx.getAccessToken());
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            } else {
                instagramApiService.sendTextMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
            }
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
