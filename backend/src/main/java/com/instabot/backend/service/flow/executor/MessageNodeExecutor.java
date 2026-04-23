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
     * 오프닝 DM — 버튼이 있으면 QuickReply + postback 대기
     */
    private NodeExecResult executeOpeningDm(FlowContext ctx, FlowNode node, JsonNode data) {
        String message = utils.replaceVariables(data.path("message").asText(""), ctx);
        String buttonText = data.path("buttonText").asText("");
        if (message.isBlank()) return NodeExecResult.ok();

        try {
            if (!buttonText.isBlank()) {
                // 병렬 플로우 라우팅을 위해 flowId + nodeId 를 payload 에 인코딩.
                String payload = PostbackPayload.encode(
                        ctx.getFlow().getId(), node.getId(), PostbackPayload.Action.OPENING);
                // Generic Template(카드 안 postback 버튼) 로 발송 — 댓글 트리거 경로와 UI 통일,
                // 클릭 시 postback 이벤트로 깔끔히 들어옴.
                instagramApiService.sendGenericTemplateWithPostback(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message,
                        buttonText, payload, ctx.getAccessToken());
                conversationService.saveOutboundMessage(
                        ctx.getIgAccount().getUser(), ctx.getSenderIgId(), message, true, ctx.getFlow().getName());
                // 버튼이 있으면 postback 대기
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            } else {
                instagramApiService.sendTextMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
            }
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), message, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: {}", e.getMessage());
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
