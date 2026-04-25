package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Random;

/**
 * 댓글 자동 답장 노드
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommentReplyNodeExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"commentReply"};
    }

    /**
     * 댓글 자동 답장 노드 실행.
     * <p>
     * COMMENT 트리거로 시작된 플로우에서만 의미 있으니 {@code ctx.commentId} 가 비어 있으면
     * 즉시 no-op 으로 통과. 비-COMMENT 트리거에 이 노드가 실수로 연결돼 있어도
     * {@code replyToComment(null, ...)} 로 NPE / Meta 400 를 던지지 않게 방어.
     *
     * @param ctx  실행 컨텍스트 — commentId / accessToken 사용.
     * @param node 노드 설정 — {@code { replies: [...], replyDelay: <초> }}.
     * @return 항상 {@code NodeExecResult.ok()} (쓰레드 인터럽트 시 {@code halt()}).
     *         답장 실패는 로그만 남기고 플로우는 계속 진행.
     */
    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        // COMMENT 트리거가 아니면 답장 대상이 없음 — skip
        String commentId = ctx.getCommentId();
        if (commentId == null || commentId.isBlank()) {
            log.debug("commentId 없음 — 댓글 답장 노드 건너뜀: flowId={}", ctx.getFlow().getId());
            return NodeExecResult.ok();
        }

        JsonNode replies = data.get("replies");
        if (replies == null || !replies.isArray() || replies.isEmpty()) return NodeExecResult.ok();

        int idx = new Random().nextInt(replies.size());
        String reply = utils.replaceVariables(replies.get(idx).asText(), ctx);

        int replyDelayMax = data.path("replyDelay").asInt(0);
        if (replyDelayMax > 0) {
            int minDelay = Math.max(1, replyDelayMax / 3);
            int actualDelay = minDelay + new Random().nextInt(replyDelayMax - minDelay + 1);
            try {
                Thread.sleep(actualDelay * 1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return NodeExecResult.halt();
            }
        }

        try {
            instagramApiService.replyToComment(commentId, reply, ctx.getAccessToken());
        } catch (Exception e) {
            log.error("댓글 답장 실패: commentId={}, error={}", commentId, e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
