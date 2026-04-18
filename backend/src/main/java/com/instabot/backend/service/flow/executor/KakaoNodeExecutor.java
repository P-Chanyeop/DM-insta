package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.service.KakaoChannelService;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 카카오 알림톡/친구톡 발송 노드
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KakaoNodeExecutor implements NodeExecutor {

    private final KakaoChannelService kakaoChannelService;
    private final ObjectMapper objectMapper;
    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"kakao"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null || !data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

        Contact contact = ctx.getContact();
        if (contact == null) return NodeExecResult.ok();

        String phone = null;
        if (contact.getCustomFields() != null) {
            try {
                JsonNode fields = objectMapper.readTree(contact.getCustomFields());
                phone = fields.path("phone").asText(null);
            } catch (Exception ignored) {}
        }
        if (phone == null || phone.isBlank()) {
            log.warn("카카오 발송 실패: 전화번호 없음, contactId={}", contact.getId());
            return NodeExecResult.ok();
        }

        Long userId = ctx.getIgAccount().getUser().getId();
        String kakaoType = data.path("kakaoType").asText("alimtalk");
        if ("alimtalk".equals(kakaoType)) {
            String templateCode = data.path("templateCode").asText("");
            Map<String, String> vars = new HashMap<>();
            vars.put("name", contact.getName() != null ? contact.getName() : "고객");
            vars.put("keyword", ctx.getTriggerKeyword() != null ? ctx.getTriggerKeyword() : "");
            kakaoChannelService.sendAlimtalk(userId, templateCode, phone, vars);
        } else {
            String message = utils.replaceVariables(data.path("message").asText(""), ctx);
            String imageUrl = data.path("imageUrl").asText(null);
            kakaoChannelService.sendFriendtalk(userId, phone, message, imageUrl);
        }
        return NodeExecResult.ok();
    }
}
