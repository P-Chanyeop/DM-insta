package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Webhook 이벤트 파싱 및 핸들러 분배
 *
 * Instagram Webhook 이벤트 구조:
 * {
 *   "object": "instagram",
 *   "entry": [{
 *     "id": "<ig-user-id>",
 *     "time": 1234567890,
 *     "messaging": [{ "sender": {"id":"..."}, "recipient": {"id":"..."}, "message": {"text":"..."} }],
 *     "changes": [{ "field": "comments", "value": { "id": "...", "text": "..." } }]
 *   }]
 * }
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookEventService {

    private final InstagramAccountRepository instagramAccountRepository;
    private final AutomationRepository automationRepository;
    private final FlowRepository flowRepository;
    private final FlowExecutionService flowExecutionService;
    private final ConversationService conversationService;
    private final ContactRepository contactRepository;
    private final ObjectMapper objectMapper;

    // 중복 실행 방지: senderIgId + flowId → 마지막 실행 시간
    private final Map<String, Long> executionCache = Collections.synchronizedMap(
            new LinkedHashMap<>(100, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Long> eldest) {
                    return size() > 1000;
                }
            }
    );

    private static final long DUPLICATE_WINDOW_MS = 60_000; // 1분 내 중복 방지

    /**
     * Webhook 이벤트 메인 핸들러
     */
    public void processWebhookEvent(JsonNode payload) {
        if (!"instagram".equals(payload.path("object").asText())) {
            log.debug("Instagram 이외 이벤트 무시: {}", payload.path("object"));
            return;
        }

        JsonNode entries = payload.get("entry");
        if (entries == null || !entries.isArray()) return;

        for (JsonNode entry : entries) {
            String igUserId = entry.path("id").asText();

            // IG 계정 조회
            InstagramAccount igAccount = instagramAccountRepository.findByIgUserId(igUserId)
                    .orElse(null);
            if (igAccount == null) {
                log.warn("등록되지 않은 IG 계정: {}", igUserId);
                continue;
            }

            // messaging 이벤트 (DM, postback)
            JsonNode messaging = entry.get("messaging");
            if (messaging != null && messaging.isArray()) {
                for (JsonNode event : messaging) {
                    handleMessagingEvent(igAccount, event);
                }
            }

            // changes 이벤트 (comments, story mentions 등)
            JsonNode changes = entry.get("changes");
            if (changes != null && changes.isArray()) {
                for (JsonNode change : changes) {
                    handleChangeEvent(igAccount, change);
                }
            }
        }
    }

    // ─── DM / Postback 이벤트 ───

    private void handleMessagingEvent(InstagramAccount igAccount, JsonNode event) {
        String senderId = event.path("sender").path("id").asText();

        // 자기 자신이 보낸 메시지는 무시
        if (senderId.equals(igAccount.getIgUserId())) return;

        User user = igAccount.getUser();

        // DM 메시지
        if (event.has("message")) {
            JsonNode message = event.get("message");
            String text = message.path("text").asText("");

            // 수신 메시지 저장
            conversationService.handleInboundMessage(user, senderId, null, text, Message.MessageType.TEXT);

            // 이메일 추출 시도
            flowExecutionService.extractEmail(text).ifPresent(email -> {
                contactRepository.findByUserIdAndIgUserId(user.getId(), senderId)
                        .ifPresent(contact -> {
                            String fields = contact.getCustomFields();
                            contact.setCustomFields(
                                    (fields != null ? fields + "," : "") + "\"email\":\"" + email + "\"");
                            contactRepository.save(contact);
                            log.info("이메일 수집: contact={}, email={}", contact.getId(), email);
                        });
            });

            // DM 키워드 트리거 매칭
            handleDmKeywordTrigger(igAccount, user, senderId, text);

            // 환영 메시지 트리거 (첫 DM인지 확인)
            handleWelcomeTrigger(igAccount, user, senderId, text);
        }

        // Postback (버튼 클릭)
        if (event.has("postback")) {
            String payload = event.path("postback").path("payload").asText("");
            log.info("Postback 수신: sender={}, payload={}", senderId, payload);
            // postback payload에 따라 다음 단계 진행
            // 예: OPENING_DM_CLICKED → 메인 DM 발송
        }
    }

    // ─── Comment / Story 이벤트 ───

    private void handleChangeEvent(InstagramAccount igAccount, JsonNode change) {
        String field = change.path("field").asText();
        JsonNode value = change.get("value");
        if (value == null) return;

        User user = igAccount.getUser();

        switch (field) {
            case "comments" -> handleCommentTrigger(igAccount, user, value);
            case "story_mentions" -> handleStoryMentionTrigger(igAccount, user, value);
            case "story_replies" -> handleStoryReplyTrigger(igAccount, user, value);
            default -> log.debug("처리하지 않는 change 필드: {}", field);
        }
    }

    // ─── 트리거별 핸들러 ───

    private void handleDmKeywordTrigger(InstagramAccount igAccount, User user, String senderId, String text) {
        List<Automation> automations = automationRepository.findByUserIdAndActiveTrue(user.getId()).stream()
                .filter(a -> a.getType() == Automation.AutomationType.DM_KEYWORD)
                .toList();

        for (Automation automation : automations) {
            if (matchesAutomationKeyword(automation, text)) {
                executeAutomationFlow(automation, igAccount, senderId, text, null);
                break; // 첫 매칭 자동화만 실행
            }
        }
    }

    private void handleCommentTrigger(InstagramAccount igAccount, User user, JsonNode value) {
        String commentId = value.path("id").asText();
        String text = value.path("text").asText("");
        String senderId = value.path("from").path("id").asText("");
        String mediaId = value.path("media").path("id").asText("");

        if (senderId.equals(igAccount.getIgUserId())) return; // 자기 댓글 무시

        List<Automation> automations = automationRepository.findByUserIdAndActiveTrue(user.getId()).stream()
                .filter(a -> a.getType() == Automation.AutomationType.COMMENT_TRIGGER)
                .toList();

        for (Automation automation : automations) {
            // 게시물 타겟 필터
            if (automation.getPostId() != null && !automation.getPostId().isBlank()
                    && !automation.getPostId().equals(mediaId)) {
                continue;
            }

            if (matchesAutomationKeyword(automation, text)) {
                executeAutomationFlow(automation, igAccount, senderId, text, commentId);
                break;
            }
        }
    }

    private void handleStoryMentionTrigger(InstagramAccount igAccount, User user, JsonNode value) {
        String senderId = value.path("sender_id").asText(
                value.path("from").path("id").asText(""));

        List<Automation> automations = automationRepository.findByUserIdAndActiveTrue(user.getId()).stream()
                .filter(a -> a.getType() == Automation.AutomationType.STORY_MENTION)
                .toList();

        for (Automation automation : automations) {
            executeAutomationFlow(automation, igAccount, senderId, "스토리 멘션", null);
            break;
        }
    }

    private void handleStoryReplyTrigger(InstagramAccount igAccount, User user, JsonNode value) {
        String senderId = value.path("sender_id").asText(
                value.path("from").path("id").asText(""));
        String text = value.path("text").asText("스토리 답장");

        List<Automation> automations = automationRepository.findByUserIdAndActiveTrue(user.getId()).stream()
                .filter(a -> a.getType() == Automation.AutomationType.STORY_REPLY)
                .toList();

        for (Automation automation : automations) {
            executeAutomationFlow(automation, igAccount, senderId, text, null);
            break;
        }
    }

    private void handleWelcomeTrigger(InstagramAccount igAccount, User user, String senderId, String text) {
        // 첫 DM인지 확인 (해당 사용자와의 Contact가 방금 생성됨 = messageCount <= 1)
        contactRepository.findByUserIdAndIgUserId(user.getId(), senderId).ifPresent(contact -> {
            if (contact.getMessageCount() <= 1) {
                List<Automation> automations = automationRepository.findByUserIdAndActiveTrue(user.getId()).stream()
                        .filter(a -> a.getType() == Automation.AutomationType.WELCOME_MESSAGE)
                        .toList();

                for (Automation automation : automations) {
                    executeAutomationFlow(automation, igAccount, senderId, text, null);
                    break;
                }
            }
        });
    }

    // ─── 공통 ───

    private boolean matchesAutomationKeyword(Automation automation, String text) {
        String keyword = automation.getKeyword();
        if (keyword == null || keyword.isBlank()) return true; // 키워드 미설정 = 모든 매칭

        String lowerText = text.toLowerCase();
        String lowerKeyword = keyword.toLowerCase();

        return switch (automation.getMatchType()) {
            case EXACT -> lowerText.equals(lowerKeyword);
            case CONTAINS -> lowerText.contains(lowerKeyword);
        };
    }

    private void executeAutomationFlow(Automation automation, InstagramAccount igAccount,
                                        String senderId, String text, String commentId) {
        // 중복 실행 방지
        String cacheKey = senderId + ":" + automation.getId();
        Long lastExec = executionCache.get(cacheKey);
        if (lastExec != null && System.currentTimeMillis() - lastExec < DUPLICATE_WINDOW_MS) {
            log.debug("중복 실행 방지: automation={}, sender={}", automation.getId(), senderId);
            return;
        }
        executionCache.put(cacheKey, System.currentTimeMillis());

        // 연결된 Flow가 있으면 실행
        Flow flow = automation.getFlow();
        if (flow == null) {
            log.warn("자동화에 연결된 플로우 없음: automationId={}", automation.getId());
            return;
        }

        if (!flow.isActive()) {
            log.debug("비활성 플로우: flowId={}", flow.getId());
            return;
        }

        // 트리거 카운트 증가
        automation.setTriggeredCount(
                automation.getTriggeredCount() == null ? 1 : automation.getTriggeredCount() + 1);

        // 플로우 실행 (비동기)
        flowExecutionService.executeFlow(flow, igAccount, senderId, text, commentId);
    }
}
