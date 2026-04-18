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

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

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
            instagramApiService.replyToComment(ctx.getCommentId(), reply, ctx.getAccessToken());
        } catch (Exception e) {
            log.error("댓글 답장 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
