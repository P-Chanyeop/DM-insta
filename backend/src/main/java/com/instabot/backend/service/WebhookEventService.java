package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.*;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.repository.*;
import com.instabot.backend.service.flow.PostbackPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Webhook 이벤트 파싱 및 핸들러 분배
 *
 * Phase 3: Automation 중간 레이어 제거 — 모든 트리거는 Flow 의 flowData 트리거 노드를 직접 매칭.
 * FlowTriggerMatcher 가 flowData JSON 에서 매칭 조건을 꺼내고, 우선순위 정렬된 Flow 리스트에서 첫 매칭을 실행한다.
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
    private final FlowRepository flowRepository;
    private final FlowExecutionService flowExecutionService;
    private final ConversationService conversationService;
    private final ContactRepository contactRepository;
    private final PendingFlowActionRepository pendingFlowActionRepository;
    private final IntegrationService integrationService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final FlowCooldownService flowCooldownService;
    private final FlowTriggerMatcher flowTriggerMatcher;
    private final InstagramApiService instagramApiService;

    // 중복 실행 방지: senderIgId + flowId → 마지막 실행 시간
    private final Map<String, Long> executionCache = Collections.synchronizedMap(
            new LinkedHashMap<String, Long>(100, 0.75f, true) {
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

        // ── Postback (버튼 클릭) ──
        if (event.has("postback")) {
            String payload = event.path("postback").path("payload").asText("");
            String title = event.path("postback").path("title").asText("");
            log.info("Postback 수신: sender={}, payload={}, title={}", senderId, payload, title);

            // 사용자가 버튼을 "누른" 것도 대화상 메시지 — 라이브 채팅에 inbound 로 저장
            // title 이 비어있으면 payload 로 대체해서라도 기록 (맥락 상실 방지)
            String displayText = !title.isBlank() ? title : "[버튼 클릭] " + payload;
            conversationService.handleInboundMessage(user, senderId, null, displayText, Message.MessageType.TEXT);

            // 외부 Webhook 전달
            integrationService.forwardWebhookEvent(user.getId(), "postback",
                    Map.of("senderIgId", senderId, "payload", payload, "title", title));

            // 우리 플로우가 만든 payload(fa:... 또는 레거시 OPENING_DM_CLICKED / FOLLOW_CHECK)
            //   → FlowExecutionService 에서 pending 진행
            // 그 외 (null) → Instagram Ice Breaker 버튼으로 간주 → ICEBREAKER 플로우 디스패치
            //   title 은 아이스브레이커 버튼 텍스트 (Meta 측 설정값). 이걸 키워드 매칭 대상 텍스트로 사용.
            if (PostbackPayload.parse(payload) != null) {
                flowExecutionService.handlePostback(senderId, payload);
            } else {
                log.info("Ice Breaker 후보 postback — sender={}, title={}, payload={}",
                        senderId, title, payload);
                dispatchFlows(user, igAccount, senderId, title, null, Flow.TriggerType.ICEBREAKER);
            }
            return; // postback은 여기서 처리 끝
        }

        // ── DM 메시지 ──
        if (event.has("message")) {
            JsonNode message = event.get("message");
            String text = message.path("text").asText("");

            // Quick Reply 클릭은 postback 이 아닌 message 이벤트로 들어오지만 quick_reply.payload 가 동봉됨.
            // postback 과 동일하게 처리해 플로우가 재개되지 않는 버그를 방지한다.
            String qrPayload = message.path("quick_reply").path("payload").asText("");
            if (!qrPayload.isBlank()) {
                log.info("Quick reply 수신(postback 으로 처리): sender={}, payload={}, title={}",
                        senderId, qrPayload, text);
                String displayText = !text.isBlank() ? text : "[버튼 클릭] " + qrPayload;
                conversationService.handleInboundMessage(user, senderId, null, displayText, Message.MessageType.TEXT);
                integrationService.forwardWebhookEvent(user.getId(), "postback",
                        Map.of("senderIgId", senderId, "payload", qrPayload, "title", text));
                flowExecutionService.handlePostback(senderId, qrPayload);
                return;
            }

            // 수신 메시지 저장
            conversationService.handleInboundMessage(user, senderId, null, text, Message.MessageType.TEXT);

            // 새 메시지 알림
            String previewText = text.length() > 50 ? text.substring(0, 50) + "..." : text;
            notificationService.notify(user.getId(), "NEW_MESSAGE",
                    "새 DM이 도착했습니다",
                    senderId + "님이 메시지를 보냈습니다: " + previewText,
                    "/app/livechat");

            // 외부 Webhook 전달
            integrationService.forwardWebhookEvent(user.getId(), "dm_received",
                    Map.of("senderIgId", senderId, "text", text));

            // ─────────────────────────────────────────────────────
            // 플로우 충돌 정책 (매니챗 스타일 — 전역 락 없이 병렬 실행)
            // ─────────────────────────────────────────────────────
            //   1. AWAITING_EMAIL 대기 중 → 이 스텝에서만 로컬 락:
            //      - 이메일 형식이면 이메일로 캡처 + 플로우 재개, 키워드 트리거 스킵
            //      - 이메일 형식 아니면 해당 pending 을 COMPLETED(취소) 후 일반 키워드 경로로 폴스루
            //   2. 그 외 pending (AWAITING_POSTBACK/FOLLOW/DELAY) 은 키워드 트리거를 막지 않음.
            //      새 DM 키워드 와 병렬로 진행 — 버튼/팔로우/딜레이는 각자 독립적으로 resolve.
            // List 로 받아 NonUniqueResultException 방어 — 같은 sender 의 같은 step 중복 pending 가능
            var emailPendingList = pendingFlowActionRepository
                    .findActiveBySenderIgIdAndStep(senderId, PendingStep.AWAITING_EMAIL, LocalDateTime.now());

            if (!emailPendingList.isEmpty()) {
                var emailOpt = flowExecutionService.extractEmail(text);
                if (emailOpt.isPresent()) {
                    String email = emailOpt.get();
                    // Contact에 이메일 저장
                    contactRepository.findByUserIdAndIgUserId(user.getId(), senderId)
                            .ifPresent(contact -> {
                                String fields = contact.getCustomFields();
                                contact.setCustomFields(
                                        (fields != null ? fields + "," : "") + "\"email\":\"" + email + "\"");
                                contactRepository.save(contact);
                                log.info("이메일 수집: contact={}, email={}", contact.getId(), email);
                            });
                    // AWAITING_EMAIL 상태인 PendingFlowAction 의 플로우 재개
                    flowExecutionService.handleRequirementFulfilled(senderId, PendingStep.AWAITING_EMAIL);
                    return; // 이메일 경로 처리 완료
                } else {
                    // 이메일 형식 아님 → 이 플로우는 취소하고 일반 DM 경로로 폴스루
                    // (가장 최근 pending 만 취소 — 나머지는 만료 또는 다른 트리거 시 정리)
                    PendingFlowAction cancelled = emailPendingList.get(0);
                    log.info("AWAITING_EMAIL 중 비이메일 수신 → 플로우 취소: pendingId={}, sender={}",
                            cancelled.getId(), senderId);
                    cancelled.setPendingStep(PendingStep.COMPLETED);
                    pendingFlowActionRepository.save(cancelled);
                    // fall through 해서 아래 키워드 트리거로 진행
                }
            }

            // DM 키워드 트리거 → Flow-native dispatch
            dispatchFlows(user, igAccount, senderId, text, null, Flow.TriggerType.KEYWORD);

            // 첫 DM 이면 WELCOME 플로우도 시도 (키워드 플로우와 별개)
            contactRepository.findByUserIdAndIgUserId(user.getId(), senderId).ifPresent(contact -> {
                if (contact.getMessageCount() <= 1) {
                    dispatchFlows(user, igAccount, senderId, text, null, Flow.TriggerType.WELCOME);
                }
            });
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
            case "feed" -> {
                // 팔로우 이벤트 감지 (Instagram은 직접적인 팔로우 webhook이 없음)
                // 팔로우는 주로 DM 대화 중 isFollower() 재확인으로 처리
            }
            default -> log.debug("처리하지 않는 change 필드: {}", field);
        }
    }

    private void handleCommentTrigger(InstagramAccount igAccount, User user, JsonNode value) {
        String commentId = value.path("id").asText();
        String text = value.path("text").asText("");
        String senderId = value.path("from").path("id").asText("");
        String mediaId = value.path("media").path("id").asText("");

        if (senderId.equals(igAccount.getIgUserId())) return; // 자기 댓글 무시

        log.info("댓글 웹훅 수신 — commentId={}, senderId={}, mediaId={}, text={}",
                commentId, senderId, mediaId, text);
        // 진단: webhook value 의 raw payload 까지 — parent_id / hidden / media.media_product_type 같은
        // 모더레이션 / mention vs comments 구분에 필요한 필드를 같이 보기 위함.
        log.info("댓글 웹훅 raw value: {}", value);

        // 진단 4: 댓글이 달린 게시물(mediaId) 의 owner 를 토큰으로 GET — 본인 게시물인지 확인
        if (mediaId != null && !mediaId.isBlank()) {
            try {
                String token = instagramApiService.getDecryptedToken(igAccount);
                instagramApiService.diagnoseMediaOwner(commentId, mediaId, token);
            } catch (Exception ex) {
                log.error("진단 4 호출 실패: commentId={}, error={}", commentId, ex.getMessage());
            }
        }

        integrationService.forwardWebhookEvent(user.getId(), "comment_received",
                Map.of("commentId", commentId, "senderIgId", senderId, "text", text, "mediaId", mediaId));

        dispatchFlows(user, igAccount, senderId, text, commentId, Flow.TriggerType.COMMENT, mediaId);
    }

    private void handleStoryMentionTrigger(InstagramAccount igAccount, User user, JsonNode value) {
        String senderId = value.path("sender_id").asText(
                value.path("from").path("id").asText(""));

        integrationService.forwardWebhookEvent(user.getId(), "story_mention",
                Map.of("senderIgId", senderId));

        dispatchFlows(user, igAccount, senderId, "스토리 멘션", null, Flow.TriggerType.STORY_MENTION);
    }

    private void handleStoryReplyTrigger(InstagramAccount igAccount, User user, JsonNode value) {
        String senderId = value.path("sender_id").asText(
                value.path("from").path("id").asText(""));
        String text = value.path("text").asText("스토리 답장");

        integrationService.forwardWebhookEvent(user.getId(), "story_reply",
                Map.of("senderIgId", senderId, "text", text));

        dispatchFlows(user, igAccount, senderId, text, null, Flow.TriggerType.STORY_REPLY);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Flow dispatch — 우선순위 정렬된 활성 Flow 중 첫 매칭 실행
    // ═══════════════════════════════════════════════════════════════

    private void dispatchFlows(User user, InstagramAccount igAccount,
                               String senderId, String text, String commentId,
                               Flow.TriggerType triggerType) {
        dispatchFlows(user, igAccount, senderId, text, commentId, triggerType, null);
    }

    private void dispatchFlows(User user, InstagramAccount igAccount,
                               String senderId, String text, String commentId,
                               Flow.TriggerType triggerType, String postId) {
        List<Flow> flows = flowRepository
                .findByUserIdAndActiveTrueAndTriggerTypeOrderByPriorityAscCreatedAtAsc(user.getId(), triggerType);

        for (Flow flow : flows) {
            if (!flowTriggerMatcher.matches(flow, text, postId)) continue;
            executeFlow(flow, igAccount, senderId, text, commentId);
            break; // 첫 매칭 플로우만 실행 (섀도잉 정책 — priority 로 유저가 순서 제어)
        }
    }

    /**
     * 3-단계 가드: 활성 재확인 / dedupe (1분 창) / 쿨다운 (기본 30초).
     */
    private void executeFlow(Flow flow, InstagramAccount igAccount,
                             String senderId, String text, String commentId) {
        // (1) 활성 체크 — 쿼리에서 이미 필터했지만 race 방지용 재조회
        Flow reloaded = flowRepository.findById(flow.getId()).orElse(null);
        if (reloaded == null || !reloaded.isActive()) return;

        // (2) dedupe — 동일 webhook 재전송 방지
        String cacheKey = "flow:" + senderId + ":" + flow.getId();
        Long lastExec = executionCache.get(cacheKey);
        if (lastExec != null && System.currentTimeMillis() - lastExec < DUPLICATE_WINDOW_MS) {
            log.debug("Flow 중복 실행 방지: flowId={}, sender={}", flow.getId(), senderId);
            return;
        }

        // (3) 쿨다운 — 동일 (flow, sender) 반복 트리거 억제
        if (!flowCooldownService.tryTrigger(flow.getId(), senderId)) return;

        executionCache.put(cacheKey, System.currentTimeMillis());
        flowExecutionService.executeFlow(reloaded, igAccount, senderId, text, commentId);
    }
}
