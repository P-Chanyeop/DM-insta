package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.service.ConversationService;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import com.instabot.backend.service.flow.PostbackPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 팔로우 확인 노드 — 팔로워면 "pass" 분기, 아니면 팔로우 요청 후 대기
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FollowCheckNodeExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"followCheck"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();

        boolean isFollower = instagramApiService.isFollower(
                ctx.getBotIgId(), ctx.getSenderIgId(), ctx.getAccessToken());

        if (isFollower) {
            return NodeExecResult.branch("pass");
        }

        // 팔로우 안 됨 → 팔로우 요청 메시지 + 대기
        String followMsg = utils.replaceVariables(
                data != null ? data.path("message").asText("링크를 받으시려면 먼저 팔로우를 해주세요!") : "링크를 받으시려면 먼저 팔로우를 해주세요!",
                ctx);
        try {
            String payload = PostbackPayload.encode(
                    ctx.getFlow().getId(), node.getId(), PostbackPayload.Action.FOLLOW);
            List<Map<String, String>> quickReplies = List.of(
                    Map.of("title", "✅ 팔로우 했어요", "payload", payload)
            );
            instagramApiService.sendQuickReplyMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), followMsg, quickReplies, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), followMsg, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("팔로우 요청 메시지 발송 실패: {}", e.getMessage());
        }

        return NodeExecResult.await(PendingStep.AWAITING_FOLLOW);
    }
}
