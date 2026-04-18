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

import java.util.*;

/**
 * 캐러셀(이미지 카드 슬라이드) 발송 노드
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CarouselNodeExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"carousel"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        JsonNode cards = data.get("cards");
        if (cards == null || !cards.isArray() || cards.isEmpty()) return NodeExecResult.ok();

        try {
            List<Map<String, Object>> cardList = new ArrayList<>();
            for (JsonNode card : cards) {
                String title = utils.replaceVariables(card.path("title").asText(""), ctx);
                if (title.isBlank()) continue;
                Map<String, Object> cardMap = new LinkedHashMap<>();
                cardMap.put("title", title);
                cardMap.put("subtitle", utils.replaceVariables(card.path("subtitle").asText(""), ctx));
                cardMap.put("imageUrl", card.path("imageUrl").asText(""));
                cardMap.put("buttonText", utils.replaceVariables(card.path("buttonText").asText(""), ctx));
                cardMap.put("buttonUrl", card.path("buttonUrl").asText(""));
                cardList.add(cardMap);
            }
            if (cardList.isEmpty()) return NodeExecResult.ok();

            instagramApiService.sendCarouselMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), cardList, ctx.getAccessToken());

            String summary = "[캐러셀] " + cardList.get(0).get("title")
                    + (cardList.size() > 1 ? " 외 " + (cardList.size() - 1) + "장" : "");
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), summary, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("캐러셀 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }
}
