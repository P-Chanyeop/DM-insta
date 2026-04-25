package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import com.instabot.backend.service.flow.PostbackPayload;
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

    /**
     * 오프닝 DM 노드 실행 — 트리거 종류에 따라 발송 경로 분기.
     * <p>
     * 댓글 트리거 (ctx.commentId != null) 는 사용자가 아직 봇에 DM 을 보낸 적 없으므로
     * 일반 DM 엔드포인트는 Meta 가 "messaging window 열려있지 않음" 으로 조용히 거절한다.
     * 반드시 Private Reply (recipient.comment_id) 로 첫 메시지를 보내야 통과.
     * <p>
     * 버튼이 있으면 24h 창을 실제로 열기 위해 postback 버튼을 같이 담아 보낸다
     * (V1 executeOpeningDm 과 동일 분기 구조 — Phase 1 Flow-native 전환 시 V2 쪽에 누락됐던 로직).
     *
     * @param ctx  실행 컨텍스트 — botIgId / senderIgId / commentId / accessToken 포함.
     * @param node 오프닝 DM 노드 스키마: {@code { enabled, message, buttonText }}.
     * @return 버튼 있으면 {@code NodeExecResult.await(AWAITING_POSTBACK)}, 그 외 {@code ok()}.
     *         메시지가 비었거나 {@code enabled=false} 여도 {@code ok()} 로 플로우는 계속 진행.
     */
    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null || !data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

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
                // 댓글 트리거 + 버튼 — Private Reply + generic_template (postback 버튼)
                String payload = PostbackPayload.encode(
                        ctx.getFlow().getId(), node.getId(), PostbackPayload.Action.OPENING);
                instagramApiService.sendPrivateReplyWithPostbackButton(
                        botIgId, commentId, message, buttonText, payload, accessToken);
                log.info("오프닝 DM(private reply + button) 발송: flowId={}, commentId={}",
                        ctx.getFlow().getId(), commentId);
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            }

            if (hasComment) {
                // 댓글 트리거 + 버튼 없음 — 단순 텍스트 Private Reply. 사용자 응답 없으면 24h 창 안 열림.
                instagramApiService.sendPrivateReplyToComment(botIgId, commentId, message, accessToken);
                log.info("오프닝 DM(private reply) 발송: flowId={}, commentId={}",
                        ctx.getFlow().getId(), commentId);
                return NodeExecResult.ok();
            }

            if (hasButton) {
                // 비-댓글 트리거 + 버튼 — 창 이미 열린 상태, quick reply 로 postback 버튼 제공.
                String payload = PostbackPayload.encode(
                        ctx.getFlow().getId(), node.getId(), PostbackPayload.Action.OPENING);
                List<Map<String, String>> quickReplies = List.of(
                        Map.of("title", buttonText, "payload", payload)
                );
                instagramApiService.sendQuickReplyMessage(
                        botIgId, senderIgId, message, quickReplies, accessToken);
                log.info("오프닝 DM(quick reply) 발송: flowId={}", ctx.getFlow().getId());
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            }

            // 비-댓글 트리거 + 버튼 없음 — 단순 텍스트 DM
            instagramApiService.sendTextMessage(botIgId, senderIgId, message, accessToken);
            log.info("오프닝 DM(text) 발송: flowId={}", ctx.getFlow().getId());
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: flowId={}, hasComment={}, hasButton={}, error={}",
                    ctx.getFlow().getId(), hasComment, hasButton, e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
