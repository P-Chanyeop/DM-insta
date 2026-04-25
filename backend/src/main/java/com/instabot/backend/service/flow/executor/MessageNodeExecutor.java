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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 메시지 노드 — role에 따라 오프닝 DM / 메인 DM / 팔로업 DM 처리.
 * 프론트엔드에서 오프닝 DM, 메인 DM, 팔로업 DM 모두 type="message"로 저장되며
 * data.role로 구분한다.
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

        String role = data.path("role").asText("");

        return switch (role) {
            case "opening" -> executeOpeningDm(ctx, node, data);
            case "main" -> executeMainDm(ctx, data);
            case "followup" -> executeFollowupDm(ctx, data);
            default -> executeMainDm(ctx, data); // fallback
        };
    }

    /**
     * 오프닝 DM ({@code role="opening"}) 실행 — 트리거 종류로 발송 엔드포인트 분기.
     * <p>
     * 댓글 트리거(ctx.commentId 존재) 는 사용자가 아직 봇에 DM 을 보낸 적이 없어서
     * 24h messaging window 가 닫혀 있음. 일반 sendTextMessage 로 쏘면 Meta 가 조용히
     * 거절하니 반드시 Private Reply (recipient.comment_id) 로 첫 메시지를 보내야 함.
     * V1 {@code FlowExecutionService.executeOpeningDm} 과 동일한 4분기 구조로 맞춤.
     *
     * @param ctx  실행 컨텍스트 — botIgId / senderIgId / commentId / accessToken / flow.
     * @param node 현재 노드 — postback payload 인코딩에 nodeId 사용.
     * @param data 노드 설정 — {@code { message, buttonText }}.
     * @return 버튼 있으면 {@code await(AWAITING_POSTBACK)}, 아니면 {@code ok()}. 메시지가 비면 {@code ok()}.
     */
    private NodeExecResult executeOpeningDm(FlowContext ctx, FlowNode node, JsonNode data) {
        String message = utils.replaceVariables(data.path("message").asText(""), ctx);
        String buttonText = data.path("buttonText").asText("");
        if (message.isBlank()) return NodeExecResult.ok();

        String botIgId = ctx.getBotIgId();
        String senderIgId = ctx.getSenderIgId();
        String accessToken = ctx.getAccessToken();
        String commentId = ctx.getCommentId();
        boolean hasComment = commentId != null && !commentId.isBlank();
        boolean hasButton = !buttonText.isBlank();

        try {
            if (hasComment && hasButton) {
                String payload = PostbackPayload.encode(
                        ctx.getFlow().getId(), node.getId(), PostbackPayload.Action.OPENING);
                instagramApiService.sendPrivateReplyWithPostbackButton(
                        botIgId, commentId, message, buttonText, payload, accessToken);
                conversationService.saveOutboundMessage(
                        ctx.getIgAccount().getUser(), senderIgId, message, true, ctx.getFlow().getName());
                log.info("오프닝 DM(private reply + button) 발송: flowId={}, commentId={}",
                        ctx.getFlow().getId(), commentId);
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            }

            if (hasComment) {
                instagramApiService.sendPrivateReplyToComment(botIgId, commentId, message, accessToken);
                conversationService.saveOutboundMessage(
                        ctx.getIgAccount().getUser(), senderIgId, message, true, ctx.getFlow().getName());
                log.info("오프닝 DM(private reply) 발송: flowId={}, commentId={}",
                        ctx.getFlow().getId(), commentId);
                return NodeExecResult.ok();
            }

            if (hasButton) {
                String payload = PostbackPayload.encode(
                        ctx.getFlow().getId(), node.getId(), PostbackPayload.Action.OPENING);
                instagramApiService.sendGenericTemplateWithPostback(
                        botIgId, senderIgId, message, buttonText, payload, accessToken);
                conversationService.saveOutboundMessage(
                        ctx.getIgAccount().getUser(), senderIgId, message, true, ctx.getFlow().getName());
                log.info("오프닝 DM(generic template + button) 발송: flowId={}", ctx.getFlow().getId());
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            }

            instagramApiService.sendTextMessage(botIgId, senderIgId, message, accessToken);
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), senderIgId, message, true, ctx.getFlow().getName());
            log.info("오프닝 DM(text) 발송: flowId={}", ctx.getFlow().getId());
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: flowId={}, hasComment={}, hasButton={}, error={}",
                    ctx.getFlow().getId(), hasComment, hasButton, e.getMessage());
        }
        return NodeExecResult.ok();
    }

    /**
     * 메인 DM — 텍스트 + 링크 버튼 포함
     */
    private NodeExecResult executeMainDm(FlowContext ctx, JsonNode data) {
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
            log.error("메인 DM 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    /**
     * 팔로업 DM — 단순 텍스트 메시지
     */
    private NodeExecResult executeFollowupDm(FlowContext ctx, JsonNode data) {
        String message = utils.replaceVariables(data.path("message").asText(""), ctx);
        if (message.isBlank()) return NodeExecResult.ok();

        try {
            instagramApiService.sendTextMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), message, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("팔로업 DM 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
