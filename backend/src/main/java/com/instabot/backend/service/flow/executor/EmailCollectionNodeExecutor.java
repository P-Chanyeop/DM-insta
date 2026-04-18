package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.service.ConversationService;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 이메일 수집 노드 — 이미 이메일 보유 시 "pass" 분기, 없으면 수집 대기
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailCollectionNodeExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"emailCollection"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();

        boolean hasEmail = utils.contactHasEmail(ctx.getIgAccount().getUser().getId(), ctx.getSenderIgId());
        if (hasEmail) {
            return NodeExecResult.branch("pass");
        }

        String emailMsg = utils.replaceVariables(
                data != null ? data.path("message").asText("이메일 주소를 입력해주세요!") : "이메일 주소를 입력해주세요!",
                ctx);
        try {
            instagramApiService.sendTextMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), emailMsg, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), emailMsg, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("이메일 요청 메시지 발송 실패: {}", e.getMessage());
        }

        return NodeExecResult.await(PendingStep.AWAITING_EMAIL);
    }
}
