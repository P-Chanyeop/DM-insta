package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.*;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.entity.ScheduledFollowUp;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * 자동화 플로우 실행 엔진 (ManyChat 동일 흐름)
 *
 * 실행 흐름:
 *   1. executeFlow()         — 트리거 감지 시 호출: 댓글답장 + 오프닝DM 발송 → AWAITING_POSTBACK 상태 저장
 *   2. handlePostback()      — 사용자 버튼 클릭 시: requirements 확인 시작
 *   3. handleRequirement()   — 팔로우/이메일 수신 시: 다음 requirement 또는 메인DM 발송
 *   4. sendMainDmAndFollowUp() — 모든 requirements 충족 시: 메인DM + 팔로업 스케줄링
 *
 * flowData JSON 구조:
 * {
 *   "trigger": { "type", "keywords", "excludeKeywords", "matchType", "postTarget" },
 *   "commentReply": { "enabled", "replies": [] },
 *   "openingDm": { "enabled", "message", "buttonText" },
 *   "requirements": { "followCheck": { "enabled", "message" }, "emailCollection": { "enabled", "message" } },
 *   "mainDm": { "message", "links": [{ "text", "url" }] },
 *   "followUp": { "enabled", "delay", "unit", "message" }
 * }
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowExecutionService {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final ObjectMapper objectMapper;
    private final FlowRepository flowRepository;
    private final ContactRepository contactRepository;
    private final PendingFlowActionRepository pendingFlowActionRepository;
    private final ScheduledFollowUpRepository scheduledFollowUpRepository;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");

    // ═══════════════════════════════════════════════════════════
    // 1단계: 트리거 감지 → 댓글답장 + 오프닝DM
    // ═══════════════════════════════════════════════════════════

    /**
     * 플로우 실행 진입점 (트리거 매칭 후 호출)
     * 댓글답장 + 오프닝DM만 발송하고, 나머지는 이벤트 기반으로 대기
     */
    @Async
    public void executeFlow(Flow flow, InstagramAccount igAccount, String senderIgId,
                             String triggerText, String commentId) {
        try {
            log.info("플로우 실행 시작: flowId={}, sender={}", flow.getId(), senderIgId);

            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            String accessToken = instagramApiService.getDecryptedToken(igAccount);
            String botIgId = igAccount.getIgUserId();

            // 1. 공개 댓글 답장
            if (commentId != null && flowData.has("commentReply")) {
                executeCommentReply(flowData.get("commentReply"), commentId, accessToken);
            }

            // 2. 오프닝 DM 발송
            boolean hasOpeningDm = false;
            if (flowData.has("openingDm")) {
                hasOpeningDm = executeOpeningDm(flowData.get("openingDm"), botIgId, senderIgId, accessToken);
            }

            // 3. requirements나 mainDm이 있는지 확인
            boolean hasRequirements = hasActiveRequirements(flowData);
            boolean hasMainDm = flowData.has("mainDm") && !flowData.get("mainDm").path("message").asText("").isBlank();

            if (hasOpeningDm && (hasRequirements || hasMainDm)) {
                // 오프닝DM에 버튼이 있으면 → postback 대기 상태로 저장
                String buttonText = flowData.path("openingDm").path("buttonText").asText("");
                if (!buttonText.isBlank()) {
                    savePendingAction(flow, igAccount, senderIgId, commentId, PendingStep.AWAITING_POSTBACK);
                    log.info("postback 대기 상태 저장: flowId={}, sender={}", flow.getId(), senderIgId);
                } else {
                    // 버튼 없는 오프닝DM → requirements부터 바로 진행
                    proceedToRequirements(flow, igAccount, senderIgId, flowData);
                }
            } else if (!hasOpeningDm && hasMainDm) {
                // 오프닝DM 없고 메인DM만 있는 경우 → 바로 발송
                sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData);
            }

            // 발송 카운트 증가
            incrementSentCount(flow);

            log.info("플로우 1단계 완료: flowId={}", flow.getId());

        } catch (Exception e) {
            log.error("플로우 실행 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 2단계: Postback 수신 → requirements 진행
    // ═══════════════════════════════════════════════════════════

    /**
     * 사용자가 오프닝DM 버튼을 클릭했을 때 호출 (WebhookEventService에서 호출)
     */
    @Async
    @Transactional
    public void handlePostback(String senderIgId, String payload) {
        if (!"OPENING_DM_CLICKED".equals(payload)) {
            log.debug("알 수 없는 postback payload: {}", payload);
            return;
        }

        PendingFlowAction pending = pendingFlowActionRepository
                .findFirstBySenderIgIdAndPendingStepOrderByCreatedAtDesc(senderIgId, PendingStep.AWAITING_POSTBACK)
                .orElse(null);

        if (pending == null || pending.isExpired()) {
            log.debug("유효한 대기 액션 없음: sender={}", senderIgId);
            return;
        }

        Flow flow = pending.getFlow();
        InstagramAccount igAccount = pending.getInstagramAccount();

        try {
            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            log.info("postback 수신 → requirements 진행: flowId={}, sender={}", flow.getId(), senderIgId);

            proceedToRequirements(flow, igAccount, senderIgId, flowData);

            // 기존 AWAITING_POSTBACK 완료 처리
            pending.setPendingStep(PendingStep.COMPLETED);
            pendingFlowActionRepository.save(pending);

        } catch (Exception e) {
            log.error("postback 처리 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3단계: Requirements 처리 (팔로우 확인, 이메일 수집)
    // ═══════════════════════════════════════════════════════════

    /**
     * requirements 순차 확인 후 다음 단계로 진행
     */
    private void proceedToRequirements(Flow flow, InstagramAccount igAccount,
                                        String senderIgId, JsonNode flowData) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();
        JsonNode requirements = flowData.get("requirements");

        // 1. 팔로우 확인
        if (requirements != null) {
            JsonNode followCheck = requirements.get("followCheck");
            if (followCheck != null && followCheck.path("enabled").asBoolean(false)) {
                boolean isFollower = instagramApiService.isFollower(botIgId, senderIgId, accessToken);
                if (!isFollower) {
                    // 팔로우 요청 메시지 발송
                    String followMsg = followCheck.path("message").asText("팔로우 후 다시 메시지를 보내주세요!");
                    try {
                        instagramApiService.sendTextMessage(botIgId, senderIgId, followMsg, accessToken);
                        conversationService.saveOutboundMessage(
                                igAccount.getUser(), senderIgId, followMsg, true, flow.getName());
                    } catch (Exception e) {
                        log.error("팔로우 요청 메시지 발송 실패: {}", e.getMessage());
                    }
                    // AWAITING_FOLLOW 상태로 저장
                    savePendingAction(flow, igAccount, senderIgId, null, PendingStep.AWAITING_FOLLOW);
                    log.info("팔로우 대기 상태 저장: flowId={}, sender={}", flow.getId(), senderIgId);
                    return; // 팔로우할 때까지 여기서 중단
                }
            }
        }

        // 2. 이메일 수집
        if (requirements != null) {
            JsonNode emailCollection = requirements.get("emailCollection");
            if (emailCollection != null && emailCollection.path("enabled").asBoolean(false)) {
                // 이미 이메일이 있는지 확인
                boolean hasEmail = contactHasEmail(igAccount.getUser().getId(), senderIgId);
                if (!hasEmail) {
                    String emailMsg = emailCollection.path("message").asText("이메일 주소를 입력해주세요!");
                    try {
                        instagramApiService.sendTextMessage(botIgId, senderIgId, emailMsg, accessToken);
                        conversationService.saveOutboundMessage(
                                igAccount.getUser(), senderIgId, emailMsg, true, flow.getName());
                    } catch (Exception e) {
                        log.error("이메일 요청 메시지 발송 실패: {}", e.getMessage());
                    }
                    // AWAITING_EMAIL 상태로 저장
                    savePendingAction(flow, igAccount, senderIgId, null, PendingStep.AWAITING_EMAIL);
                    log.info("이메일 대기 상태 저장: flowId={}, sender={}", flow.getId(), senderIgId);
                    return; // 이메일 받을 때까지 여기서 중단
                }
            }
        }

        // 3. 모든 requirements 충족 → 메인DM + 팔로업 발송
        sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData);
    }

    /**
     * 사용자가 팔로우하거나 이메일을 보냈을 때 호출 (WebhookEventService에서 호출)
     */
    @Async
    @Transactional
    public void handleRequirementFulfilled(String senderIgId, PendingStep fulfilledStep) {
        PendingFlowAction pending = pendingFlowActionRepository
                .findFirstBySenderIgIdAndPendingStepOrderByCreatedAtDesc(senderIgId, fulfilledStep)
                .orElse(null);

        if (pending == null || pending.isExpired()) {
            log.debug("유효한 대기 액션 없음: sender={}, step={}", senderIgId, fulfilledStep);
            return;
        }

        Flow flow = pending.getFlow();
        InstagramAccount igAccount = pending.getInstagramAccount();

        try {
            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            log.info("requirement 충족 → 다음 단계 진행: flowId={}, step={}", flow.getId(), fulfilledStep);

            // 현재 pending 완료 처리
            pending.setPendingStep(PendingStep.COMPLETED);
            pendingFlowActionRepository.save(pending);

            // 다음 requirements부터 이어서 진행
            if (fulfilledStep == PendingStep.AWAITING_FOLLOW) {
                // 팔로우 완료 → 이메일 수집부터 이어서
                proceedToRequirementsAfterFollow(flow, igAccount, senderIgId, flowData);
            } else if (fulfilledStep == PendingStep.AWAITING_EMAIL) {
                // 이메일 완료 → 메인DM 발송
                sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData);
            }

        } catch (Exception e) {
            log.error("requirement 처리 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    /**
     * 팔로우 완료 후 → 이메일 수집 확인 → 메인DM
     */
    private void proceedToRequirementsAfterFollow(Flow flow, InstagramAccount igAccount,
                                                    String senderIgId, JsonNode flowData) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();
        JsonNode requirements = flowData.get("requirements");

        // 이메일 수집 확인
        if (requirements != null) {
            JsonNode emailCollection = requirements.get("emailCollection");
            if (emailCollection != null && emailCollection.path("enabled").asBoolean(false)) {
                boolean hasEmail = contactHasEmail(igAccount.getUser().getId(), senderIgId);
                if (!hasEmail) {
                    String emailMsg = emailCollection.path("message").asText("이메일 주소를 입력해주세요!");
                    try {
                        instagramApiService.sendTextMessage(botIgId, senderIgId, emailMsg, accessToken);
                        conversationService.saveOutboundMessage(
                                igAccount.getUser(), senderIgId, emailMsg, true, flow.getName());
                    } catch (Exception e) {
                        log.error("이메일 요청 메시지 발송 실패: {}", e.getMessage());
                    }
                    savePendingAction(flow, igAccount, senderIgId, null, PendingStep.AWAITING_EMAIL);
                    return;
                }
            }
        }

        // 모든 requirements 충족
        sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData);
    }

    // ═══════════════════════════════════════════════════════════
    // 4단계: 메인DM + 팔로업 발송
    // ═══════════════════════════════════════════════════════════

    /**
     * 모든 requirements 충족 후 메인DM 발송 + 팔로업 스케줄링
     */
    private void sendMainDmAndFollowUp(Flow flow, InstagramAccount igAccount,
                                         String senderIgId, JsonNode flowData) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();

        // 메인 DM 발송
        if (flowData.has("mainDm")) {
            executeMainDm(flowData.get("mainDm"), botIgId, senderIgId, accessToken);
            conversationService.saveOutboundMessage(
                    igAccount.getUser(), senderIgId,
                    flowData.get("mainDm").path("message").asText(""),
                    true, flow.getName());
        }

        // 팔로업 메시지 스케줄링 (DB에 영구 저장)
        if (flowData.has("followUp")) {
            scheduleFollowUp(flowData.get("followUp"), igAccount, senderIgId);
        }

        log.info("메인DM + 팔로업 완료: flowId={}, sender={}", flow.getId(), senderIgId);
    }

    // ═══════════════════════════════════════════════════════════
    // 개별 단계 실행
    // ═══════════════════════════════════════════════════════════

    private void executeCommentReply(JsonNode commentReplyNode, String commentId, String accessToken) {
        if (!commentReplyNode.path("enabled").asBoolean(false)) return;

        JsonNode replies = commentReplyNode.get("replies");
        if (replies == null || !replies.isArray() || replies.isEmpty()) return;

        int idx = new Random().nextInt(replies.size());
        String reply = replies.get(idx).asText();

        try {
            instagramApiService.replyToComment(commentId, reply, accessToken);
            log.debug("댓글 답장 완료: commentId={}", commentId);
        } catch (Exception e) {
            log.error("댓글 답장 실패: {}", e.getMessage());
        }
    }

    /**
     * @return 오프닝DM이 실제로 발송되었으면 true
     */
    private boolean executeOpeningDm(JsonNode openingDmNode, String botIgId, String recipientId,
                                      String accessToken) {
        if (!openingDmNode.path("enabled").asBoolean(false)) return false;

        String message = openingDmNode.path("message").asText("");
        String buttonText = openingDmNode.path("buttonText").asText("");

        if (message.isBlank()) return false;

        try {
            if (!buttonText.isBlank()) {
                List<Map<String, String>> quickReplies = List.of(
                        Map.of("title", buttonText, "payload", "OPENING_DM_CLICKED")
                );
                instagramApiService.sendQuickReplyMessage(botIgId, recipientId, message, quickReplies, accessToken);
            } else {
                instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
            }
            log.debug("오프닝 DM 발송 완료: recipient={}", recipientId);
            return true;
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: {}", e.getMessage());
            return false;
        }
    }

    private void executeMainDm(JsonNode mainDmNode, String botIgId, String recipientId,
                                String accessToken) {
        String message = mainDmNode.path("message").asText("");
        if (message.isBlank()) return;

        JsonNode links = mainDmNode.get("links");

        try {
            if (links != null && links.isArray() && !links.isEmpty()) {
                List<Map<String, String>> buttons = new ArrayList<>();
                for (JsonNode link : links) {
                    String text = link.path("text").asText("");
                    String url = link.path("url").asText("");
                    if (!text.isBlank() && !url.isBlank()) {
                        buttons.add(Map.of("title", text, "url", url));
                    }
                }

                if (!buttons.isEmpty()) {
                    instagramApiService.sendGenericTemplate(botIgId, recipientId, message, null, buttons, accessToken);
                } else {
                    instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
                }
            } else {
                instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
            }
            log.debug("메인 DM 발송 완료: recipient={}", recipientId);
        } catch (Exception e) {
            log.error("메인 DM 발송 실패: {}", e.getMessage());
        }
    }

    /**
     * 팔로업 메시지를 DB에 영구 저장 (Thread.sleep 대신)
     * FollowUpSchedulerService가 매분 폴링하여 발송
     */
    private void scheduleFollowUp(JsonNode followUpNode, InstagramAccount igAccount, String recipientId) {
        if (!followUpNode.path("enabled").asBoolean(false)) return;

        String message = followUpNode.path("message").asText("");
        if (message.isBlank()) return;

        int delay = followUpNode.path("delay").asInt(30);
        String unit = followUpNode.path("unit").asText("분");

        long delayMinutes = switch (unit) {
            case "시간" -> (long) delay * 60;
            case "일" -> (long) delay * 60 * 24;
            default -> delay; // 분
        };

        ScheduledFollowUp followUp = ScheduledFollowUp.builder()
                .instagramAccount(igAccount)
                .recipientIgId(recipientId)
                .message(message)
                .scheduledAt(LocalDateTime.now().plusMinutes(delayMinutes))
                .status(ScheduledFollowUp.Status.PENDING)
                .build();

        scheduledFollowUpRepository.save(followUp);
        log.info("팔로업 스케줄 저장: recipient={}, scheduledAt={}", recipientId, followUp.getScheduledAt());
    }

    // ═══════════════════════════════════════════════════════════
    // 유틸리티
    // ═══════════════════════════════════════════════════════════

    private boolean hasActiveRequirements(JsonNode flowData) {
        JsonNode req = flowData.get("requirements");
        if (req == null) return false;

        boolean followEnabled = req.path("followCheck").path("enabled").asBoolean(false);
        boolean emailEnabled = req.path("emailCollection").path("enabled").asBoolean(false);
        return followEnabled || emailEnabled;
    }

    private boolean contactHasEmail(Long userId, String senderIgId) {
        return contactRepository.findByUserIdAndIgUserId(userId, senderIgId)
                .map(contact -> {
                    String fields = contact.getCustomFields();
                    return fields != null && fields.contains("\"email\":");
                })
                .orElse(false);
    }

    @Transactional
    private void savePendingAction(Flow flow, InstagramAccount igAccount,
                                    String senderIgId, String commentId, PendingStep step) {
        PendingFlowAction action = PendingFlowAction.builder()
                .flow(flow)
                .instagramAccount(igAccount)
                .senderIgId(senderIgId)
                .commentId(commentId)
                .pendingStep(step)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        pendingFlowActionRepository.save(action);
    }

    // ─── 트리거 매칭 ───

    public boolean matchesKeyword(JsonNode triggerNode, String text) {
        if (text == null || text.isBlank()) return false;

        JsonNode keywords = triggerNode.get("keywords");
        if (keywords == null || !keywords.isArray() || keywords.isEmpty()) {
            return true;
        }

        String matchType = triggerNode.path("matchType").asText("CONTAINS");
        String lowerText = text.toLowerCase();

        for (JsonNode kw : keywords) {
            String keyword = kw.asText().toLowerCase();
            boolean matched = switch (matchType) {
                case "EXACT" -> lowerText.equals(keyword);
                case "STARTS_WITH" -> lowerText.startsWith(keyword);
                default -> lowerText.contains(keyword);
            };
            if (matched) return true;
        }

        return false;
    }

    public boolean matchesExcludeKeyword(JsonNode triggerNode, String text) {
        if (text == null) return false;

        JsonNode excludeKeywords = triggerNode.get("excludeKeywords");
        if (excludeKeywords == null || !excludeKeywords.isArray()) return false;

        String lowerText = text.toLowerCase();
        for (JsonNode kw : excludeKeywords) {
            if (lowerText.contains(kw.asText().toLowerCase())) return true;
        }
        return false;
    }

    public Optional<String> extractEmail(String text) {
        if (text == null) return Optional.empty();
        var matcher = EMAIL_PATTERN.matcher(text);
        return matcher.find() ? Optional.of(matcher.group()) : Optional.empty();
    }

    @Transactional
    public void incrementSentCount(Flow flow) {
        flow.setSentCount(flow.getSentCount() == null ? 1 : flow.getSentCount() + 1);
        flowRepository.save(flow);
    }
}
