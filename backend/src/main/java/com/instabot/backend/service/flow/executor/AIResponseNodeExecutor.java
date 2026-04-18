package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.AIService;
import com.instabot.backend.service.ConversationService;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * AI 자동 응답 노드 — AI 서비스에 위임하여 응답 생성 후 발송
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AIResponseNodeExecutor implements NodeExecutor {

    private final AIService aiService;
    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"aiResponse"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        String userMessage = ctx.getTriggerKeyword() != null ? ctx.getTriggerKeyword() : "";
        if (userMessage.isBlank()) return NodeExecResult.ok();

        List<String> history = Collections.emptyList();
        try {
            history = conversationService.getRecentMessages(
                    ctx.getIgAccount().getUser().getId(), ctx.getSenderIgId(),
                    data.path("contextWindow").asInt(3));
        } catch (Exception e) {
            log.debug("대화 기록 조회 실패: {}", e.getMessage());
        }

        String response = aiService.executeAIResponse(
                ctx.getIgAccount().getUser().getId(), userMessage, data, history, ctx.getContact());
        if (response == null || response.isBlank()) {
            response = aiService.getFallbackResponse(data);
        }
        response = utils.replaceVariables(response, ctx);

        try {
            instagramApiService.sendTextMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), response, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), response,
                    true, ctx.getFlow().getName() + " (AI)");
        } catch (Exception e) {
            log.error("AI 응답 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
