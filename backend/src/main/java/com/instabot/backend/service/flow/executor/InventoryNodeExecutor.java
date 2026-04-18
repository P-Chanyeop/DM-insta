package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.GroupBuy;
import com.instabot.backend.repository.GroupBuyRepository;
import com.instabot.backend.service.ConversationService;
import com.instabot.backend.service.GroupBuyService;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 재고/공동구매 확인 노드 — 재고 있으면 "pass" (참여 등록), 매진이면 "fail"
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryNodeExecutor implements NodeExecutor {

    private final GroupBuyRepository groupBuyRepository;
    private final GroupBuyService groupBuyService;
    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"inventory"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.branch("pass");

        long groupBuyId = data.path("groupBuyId").asLong(0);
        if (groupBuyId == 0) return NodeExecResult.branch("pass");

        try {
            GroupBuy groupBuy = groupBuyRepository.findById(groupBuyId).orElse(null);
            if (groupBuy == null) return NodeExecResult.branch("pass");

            if (!groupBuy.hasStock()) {
                String soldOutMsg = utils.replaceVariables(
                        data.path("soldOutMessage").asText("죄송합니다, 이 상품은 매진되었습니다. 😢"), ctx);
                try {
                    instagramApiService.sendTextMessage(
                            ctx.getBotIgId(), ctx.getSenderIgId(), soldOutMsg, ctx.getAccessToken());
                    conversationService.saveOutboundMessage(
                            ctx.getIgAccount().getUser(), ctx.getSenderIgId(), soldOutMsg, true, ctx.getFlow().getName());
                } catch (Exception e) {
                    log.error("매진 메시지 발송 실패: {}", e.getMessage());
                }
                return NodeExecResult.branch("fail");
            }

            Long contactId = ctx.getContact() != null ? ctx.getContact().getId() : null;
            if (contactId != null) {
                try {
                    groupBuyService.addParticipant(groupBuyId, contactId, null, 1);
                } catch (Exception e) {
                    log.info("공동구매 참여 등록 스킵: {}", e.getMessage());
                }
            }
            return NodeExecResult.branch("pass");
        } catch (Exception e) {
            log.error("인벤토리 노드 실행 실패: {}", e.getMessage());
            return NodeExecResult.branch("pass");
        }
    }
}
