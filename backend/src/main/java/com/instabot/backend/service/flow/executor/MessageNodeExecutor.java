package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.ConversationService;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 메시지(메인 DM) 노드 — 텍스트 또는 링크 버튼 포함 DM 발송
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageNodeExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"message"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        String message = utils.replaceVariables(data.path("message").asText(""), ctx);
        if (message.isBlank()) return NodeExecResult.ok();

        JsonNode links = data.get("links");
        try {
            if (links != null && links.isArray() && !links.isEmpty()) {
                List<Map<String, String>> buttons = new ArrayList<>();
                for (JsonNode link : links) {
                    String text = link.path("text").asText(link.path("label").asText(""));
                    String url = link.path("url").asText("");
                    if (!text.isBlank() && !url.isBlank()) {
                        buttons.add(Map.of("title", text, "url", url));
                    }
                }
                if (!buttons.isEmpty()) {
                    instagramApiService.sendGenericTemplate(
                            ctx.getBotIgId(), ctx.getSenderIgId(), message, null, buttons, ctx.getAccessToken());
                } else {
                    instagramApiService.sendTextMessage(
                            ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
                }
            } else {
                instagramApiService.sendTextMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
            }

            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), message, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("메시지 DM 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
