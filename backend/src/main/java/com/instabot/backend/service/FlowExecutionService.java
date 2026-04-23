package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.flow.*;
import com.instabot.backend.entity.*;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.entity.ScheduledFollowUp;
import com.instabot.backend.repository.*;
import com.instabot.backend.service.flow.FlowGraphParser;
import com.instabot.backend.service.flow.NodeExecutor;
import com.instabot.backend.service.flow.NodeExecutorRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
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
    private final AIService aiService;
    private final GroupBuyService groupBuyService;
    private final RecurringNotificationService recurringNotificationService;
    private final ObjectMapper objectMapper;
    private final FlowRepository flowRepository;
    private final ContactRepository contactRepository;
    private final GroupBuyRepository groupBuyRepository;
    private final PendingFlowActionRepository pendingFlowActionRepository;
    private final ScheduledFollowUpRepository scheduledFollowUpRepository;
    private final NodeExecutionRepository nodeExecutionRepository;
    private final ABTestService abTestService;
    private final KakaoChannelService kakaoChannelService;
    private final NodeExecutorRegistry nodeExecutorRegistry;
    private final @Lazy NotificationService notificationService;

    private static final int MAX_GRAPH_STEPS = 50;

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
            int version = flowData.path("version").asInt(1);

            // ── v2 그래프 실행 ──
            if (version >= 2) {
                executeFlowV2(flow, igAccount, senderIgId, triggerText, commentId, flowData);
                return;
            }

            // ── v1 레거시 실행 (아래 기존 코드) ──
            String accessToken = instagramApiService.getDecryptedToken(igAccount);
            String botIgId = igAccount.getIgUserId();

            // Contact 보장: 없으면 Instagram 프로필 조회해서 username/name 채워 생성.
            // 라이브 채팅에 PSID 대신 @username + 이름이 뜨게 하기 위함.
            ensureContactWithProfile(igAccount.getUser(), senderIgId, accessToken);

            // 변수 치환을 위한 Contact 조회
            Contact contact = findContact(igAccount.getUser().getId(), senderIgId);
            Long contactId = contact != null ? contact.getId() : null;

            // 트리거 진입 추적
            trackNode(flow.getId(), "trigger", NodeExecution.Action.COMPLETED, contactId);

            // 1. 공개 댓글 답장
            if (commentId != null && flowData.has("commentReply")) {
                trackNode(flow.getId(), "commentReply", NodeExecution.Action.ENTERED, contactId);
                executeCommentReply(flowData.get("commentReply"), commentId, accessToken, contact, triggerText);
                trackNode(flow.getId(), "commentReply", NodeExecution.Action.COMPLETED, contactId);
            }

            // 2. 오프닝 DM 발송 — 댓글 트리거면 commentId 전달해서 Private Reply 로 24시간 창 염.
            boolean hasOpeningDm = false;
            if (flowData.has("openingDm")) {
                trackNode(flow.getId(), "openingDm", NodeExecution.Action.ENTERED, contactId);
                hasOpeningDm = executeOpeningDm(flowData.get("openingDm"), botIgId, senderIgId, accessToken, contact, triggerText, commentId);
                if (hasOpeningDm) {
                    trackNode(flow.getId(), "openingDm", NodeExecution.Action.COMPLETED, contactId);
                    // 라이브 채팅에 노출되도록 발신 메시지 저장
                    String openingMsg = replaceVariables(
                            flowData.path("openingDm").path("message").asText(""), contact, triggerText);
                    if (!openingMsg.isBlank()) {
                        conversationService.saveOutboundMessage(
                                flow.getUser(), senderIgId, openingMsg, true,
                                flow.getName() + " — 오프닝 DM",
                                Message.MessageType.TEXT, null, null, flow.getId(), null);
                    }
                }
            }

            // 3. requirements나 mainDm이 있는지 확인
            boolean hasRequirements = hasActiveRequirements(flowData);
            boolean hasMainDm = flowData.has("mainDm") && !flowData.get("mainDm").path("message").asText("").isBlank();

            if (hasOpeningDm && (hasRequirements || hasMainDm)) {
                // 오프닝DM에 버튼이 있으면 → postback 대기 상태로 저장
                String buttonText = flowData.path("openingDm").path("buttonText").asText("");
                if (!buttonText.isBlank()) {
                    savePendingAction(flow, igAccount, senderIgId, commentId, PendingStep.AWAITING_POSTBACK, triggerText);
                    log.info("postback 대기 상태 저장: flowId={}, sender={}", flow.getId(), senderIgId);
                } else {
                    // 버튼 없는 오프닝DM → requirements부터 바로 진행
                    proceedToRequirements(flow, igAccount, senderIgId, flowData, triggerText);
                }
            } else if (!hasOpeningDm && hasMainDm) {
                // 오프닝DM 없고 메인DM만 있는 경우 → 바로 발송
                sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData, triggerText);
            }

            // 발송 카운트 증가
            incrementSentCount(flow);

            log.info("플로우 1단계 완료: flowId={}", flow.getId());

        } catch (Exception e) {
            log.error("플로우 실행 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
            try {
                Long userId = flow.getUser() != null ? flow.getUser().getId() : null;
                if (userId != null) {
                    notificationService.notify(userId, "AUTOMATION_ERROR",
                            "플로우 실행 오류",
                            "플로우 '" + flow.getName() + "' 실행 중 오류: " + e.getMessage(),
                            "/app/flows");
                }
            } catch (Exception ne) {
                log.warn("알림 발송 실패: {}", ne.getMessage());
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 2단계: Postback 수신 → requirements 진행
    // ═══════════════════════════════════════════════════════════

    /**
     * 사용자가 버튼을 클릭했을 때 호출 (WebhookEventService에서 호출)
     * - OPENING_DM_CLICKED: 오프닝DM 버튼 → requirements 시작
     * - FOLLOW_CHECK: 팔로우 재확인 버튼 → 팔로우 확인 후 진행
     */
    @Async
    @Transactional
    public void handlePostback(String senderIgId, String payload) {

        if ("OPENING_DM_CLICKED".equals(payload)) {
            handleOpeningDmPostback(senderIgId);
        } else if ("FOLLOW_CHECK".equals(payload)) {
            handleFollowCheckPostback(senderIgId);
        } else {
            log.debug("알 수 없는 postback payload: {}", payload);
        }
    }

    private void handleOpeningDmPostback(String senderIgId) {
        PendingFlowAction pending = pendingFlowActionRepository
                .findFirstBySenderIgIdAndPendingStepOrderByCreatedAtDesc(senderIgId, PendingStep.AWAITING_POSTBACK)
                .orElse(null);

        if (pending == null || pending.isExpired()) {
            log.debug("유효한 AWAITING_POSTBACK 없음: sender={}", senderIgId);
            return;
        }

        Flow flow = pending.getFlow();
        InstagramAccount igAccount = pending.getInstagramAccount();

        try {
            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            log.info("오프닝DM 버튼 클릭 → requirements 진행: flowId={}, sender={}", flow.getId(), senderIgId);

            String triggerKeyword = pending.getTriggerKeyword();
            String currentNodeId = pending.getCurrentNodeId();
            pending.setPendingStep(PendingStep.COMPLETED);
            pendingFlowActionRepository.save(pending);

            // v2 그래프: currentNodeId가 있으면 그래프 순회 재개
            if (currentNodeId != null) {
                resumeFlowGraph(flow, igAccount, senderIgId, triggerKeyword, currentNodeId, pending.getCommentId());
                return;
            }

            // v1 레거시
            proceedToRequirements(flow, igAccount, senderIgId, flowData, triggerKeyword);

        } catch (Exception e) {
            log.error("오프닝DM postback 처리 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    /**
     * "✅ 팔로우 했어요" 버튼 클릭 시: 팔로우 재확인
     * - 팔로우 확인됨 → 다음 단계 (이메일 수집 or 메인DM)
     * - 팔로우 안 됨 → "팔로우가 확인되지 않았어요!" + 재확인 버튼 다시 발송
     */
    private void handleFollowCheckPostback(String senderIgId) {
        PendingFlowAction pending = pendingFlowActionRepository
                .findFirstBySenderIgIdAndPendingStepOrderByCreatedAtDesc(senderIgId, PendingStep.AWAITING_FOLLOW)
                .orElse(null);

        if (pending == null || pending.isExpired()) {
            log.debug("유효한 AWAITING_FOLLOW 없음: sender={}", senderIgId);
            return;
        }

        Flow flow = pending.getFlow();
        InstagramAccount igAccount = pending.getInstagramAccount();
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();

        try {
            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            boolean isFollower = instagramApiService.isFollower(botIgId, senderIgId, accessToken);

            if (isFollower) {
                // ✅ 팔로우 확인됨 → 다음 단계 진행
                log.info("팔로우 확인 완료: flowId={}, sender={}", flow.getId(), senderIgId);
                String triggerKeyword = pending.getTriggerKeyword();
                String currentNodeId = pending.getCurrentNodeId();
                pending.setPendingStep(PendingStep.COMPLETED);
                pendingFlowActionRepository.save(pending);

                // v2 그래프: currentNodeId가 있으면 그래프 순회 재개 ("pass" 분기)
                if (currentNodeId != null) {
                    resumeFlowGraph(flow, igAccount, senderIgId, triggerKeyword,
                            currentNodeId, pending.getCommentId(), "pass");
                    return;
                }

                // v1 레거시
                proceedToRequirementsAfterFollow(flow, igAccount, senderIgId, flowData, triggerKeyword);
            } else {
                // ❌ 아직 팔로우 안 됨
                String currentNodeId = pending.getCurrentNodeId();

                // v2: "fail" 엣지가 연결된 경우 → fail 분기로 진행
                if (currentNodeId != null) {
                    FlowGraph graph = FlowGraphParser.parse(flowData.toString());
                    String failTarget = graph.chooseNext(currentNodeId, "fail");
                    if (failTarget != null) {
                        log.info("팔로우 미확인 → fail 분기 진행: flowId={}, sender={}", flow.getId(), senderIgId);
                        String triggerKeyword = pending.getTriggerKeyword();
                        pending.setPendingStep(PendingStep.COMPLETED);
                        pendingFlowActionRepository.save(pending);
                        resumeFlowGraph(flow, igAccount, senderIgId, triggerKeyword,
                                currentNodeId, pending.getCommentId(), "fail");
                        return;
                    }
                }

                // fail 엣지 없으면 기존 동작: 재확인 메시지 + 버튼 다시 발송
                log.info("팔로우 미확인 → 재확인 버튼 발송: flowId={}, sender={}", flow.getId(), senderIgId);
                sendFollowRetryMessage(botIgId, senderIgId, accessToken, igAccount, flow);
            }

        } catch (Exception e) {
            log.error("팔로우 확인 postback 처리 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3단계: Requirements 처리 (팔로우 확인, 이메일 수집)
    // ═══════════════════════════════════════════════════════════

    /**
     * requirements 순차 확인 후 다음 단계로 진행
     */
    private void proceedToRequirements(Flow flow, InstagramAccount igAccount,
                                        String senderIgId, JsonNode flowData, String triggerKeyword) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();
        JsonNode requirements = flowData.get("requirements");

        // 변수 치환을 위한 Contact 조회
        Contact contact = findContact(igAccount.getUser().getId(), senderIgId);
        Long cId = contact != null ? contact.getId() : null;

        // 1. 팔로우 확인
        if (requirements != null) {
            JsonNode followCheck = requirements.get("followCheck");
            if (followCheck != null && followCheck.path("enabled").asBoolean(false)) {
                trackNode(flow.getId(), "followCheck", NodeExecution.Action.ENTERED, cId);
                boolean isFollower = instagramApiService.isFollower(botIgId, senderIgId, accessToken);
                if (!isFollower) {
                    sendFollowRequestMessage(followCheck, botIgId, senderIgId, accessToken, igAccount, flow, contact);
                    savePendingAction(flow, igAccount, senderIgId, null, PendingStep.AWAITING_FOLLOW, triggerKeyword);
                    log.info("팔로우 대기 상태 저장: flowId={}, sender={}", flow.getId(), senderIgId);
                    return;  // 팔로우 완료 시 handleFollowCheckPostback에서 COMPLETED 추적
                }
                trackNode(flow.getId(), "followCheck", NodeExecution.Action.COMPLETED, cId);
            }
        }

        // 2. 이메일 수집
        if (requirements != null) {
            JsonNode emailCollection = requirements.get("emailCollection");
            if (emailCollection != null && emailCollection.path("enabled").asBoolean(false)) {
                trackNode(flow.getId(), "emailCollection", NodeExecution.Action.ENTERED, cId);
                boolean hasEmail = contactHasEmail(igAccount.getUser().getId(), senderIgId);
                if (!hasEmail) {
                    String emailMsg = replaceVariables(
                            emailCollection.path("message").asText("이메일 주소를 입력해주세요!"), contact, triggerKeyword);
                    try {
                        instagramApiService.sendTextMessage(botIgId, senderIgId, emailMsg, accessToken);
                        conversationService.saveOutboundMessage(
                                igAccount.getUser(), senderIgId, emailMsg, true, flow.getName());
                    } catch (Exception e) {
                        log.error("이메일 요청 메시지 발송 실패: {}", e.getMessage());
                    }
                    savePendingAction(flow, igAccount, senderIgId, null, PendingStep.AWAITING_EMAIL, triggerKeyword);
                    log.info("이메일 대기 상태 저장: flowId={}, sender={}", flow.getId(), senderIgId);
                    return;
                }
            }
        }

        // 3. 모든 requirements 충족 → 메인DM + 팔로업 발송
        sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData, triggerKeyword);
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
            String triggerKeyword = pending.getTriggerKeyword();
            log.info("requirement 충족 → 다음 단계 진행: flowId={}, step={}", flow.getId(), fulfilledStep);

            // 현재 pending 완료 처리
            String currentNodeId = pending.getCurrentNodeId();
            pending.setPendingStep(PendingStep.COMPLETED);
            pendingFlowActionRepository.save(pending);

            // v2 그래프: currentNodeId가 있으면 그래프 순회 재개
            if (currentNodeId != null) {
                String branch = (fulfilledStep == PendingStep.AWAITING_FOLLOW) ? "pass" : "pass";
                resumeFlowGraph(flow, igAccount, senderIgId, triggerKeyword,
                        currentNodeId, pending.getCommentId(), branch);
                return;
            }

            // ── v1 레거시 ──
            // 충족된 requirement 완료 추적
            Contact contact = findContact(igAccount.getUser().getId(), senderIgId);
            Long cId = contact != null ? contact.getId() : null;
            if (fulfilledStep == PendingStep.AWAITING_FOLLOW) {
                trackNode(flow.getId(), "followCheck", NodeExecution.Action.COMPLETED, cId);
            } else if (fulfilledStep == PendingStep.AWAITING_EMAIL) {
                trackNode(flow.getId(), "emailCollection", NodeExecution.Action.COMPLETED, cId);
            }

            // 다음 requirements부터 이어서 진행
            if (fulfilledStep == PendingStep.AWAITING_FOLLOW) {
                proceedToRequirementsAfterFollow(flow, igAccount, senderIgId, flowData, triggerKeyword);
            } else if (fulfilledStep == PendingStep.AWAITING_EMAIL) {
                sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData, triggerKeyword);
            }

        } catch (Exception e) {
            log.error("requirement 처리 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    /**
     * 팔로우 완료 후 → 이메일 수집 확인 → 메인DM
     */
    private void proceedToRequirementsAfterFollow(Flow flow, InstagramAccount igAccount,
                                                    String senderIgId, JsonNode flowData,
                                                    String triggerKeyword) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();
        JsonNode requirements = flowData.get("requirements");

        // 변수 치환을 위한 Contact 조회
        Contact contact = findContact(igAccount.getUser().getId(), senderIgId);

        // 이메일 수집 확인
        if (requirements != null) {
            JsonNode emailCollection = requirements.get("emailCollection");
            if (emailCollection != null && emailCollection.path("enabled").asBoolean(false)) {
                boolean hasEmail = contactHasEmail(igAccount.getUser().getId(), senderIgId);
                if (!hasEmail) {
                    String emailMsg = replaceVariables(
                            emailCollection.path("message").asText("이메일 주소를 입력해주세요!"), contact, triggerKeyword);
                    try {
                        instagramApiService.sendTextMessage(botIgId, senderIgId, emailMsg, accessToken);
                        conversationService.saveOutboundMessage(
                                igAccount.getUser(), senderIgId, emailMsg, true, flow.getName());
                    } catch (Exception e) {
                        log.error("이메일 요청 메시지 발송 실패: {}", e.getMessage());
                    }
                    savePendingAction(flow, igAccount, senderIgId, null, PendingStep.AWAITING_EMAIL, triggerKeyword);
                    return;
                }
            }
        }

        // 모든 requirements 충족
        sendMainDmAndFollowUp(flow, igAccount, senderIgId, flowData, triggerKeyword);
    }

    // ═══════════════════════════════════════════════════════════
    // 4단계: 메인DM + 팔로업 발송
    // ═══════════════════════════════════════════════════════════

    /**
     * 모든 requirements 충족 후 메인DM 발송 + 팔로업 스케줄링
     */
    private void sendMainDmAndFollowUp(Flow flow, InstagramAccount igAccount,
                                         String senderIgId, JsonNode flowData,
                                         String triggerKeyword) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();

        // 변수 치환을 위한 Contact 조회
        Contact contact = findContact(igAccount.getUser().getId(), senderIgId);
        Long contactId = contact != null ? contact.getId() : null;

        // 고급 조건 평가 (즉시 평가형 — 실패 시 플로우 중단)
        if (flowData.has("conditions")) {
            JsonNode conditions = flowData.get("conditions");
            if (conditions.isArray()) {
                for (JsonNode cond : conditions) {
                    if (!cond.path("enabled").asBoolean(false)) continue;
                    String condType = cond.path("type").asText("condition");
                    trackNode(flow.getId(), "condition_" + condType, NodeExecution.Action.ENTERED, contactId);
                    if (!evaluateCondition(cond, contact)) {
                        trackNode(flow.getId(), "condition_" + condType, NodeExecution.Action.DROPPED, contactId,
                                "{\"reason\":\"condition_not_met\"}");
                        log.info("고급 조건 미충족, 플로우 중단: flowId={}, type={}, sender={}",
                                flow.getId(), condType, senderIgId);
                        return;
                    }
                    trackNode(flow.getId(), "condition_" + condType, NodeExecution.Action.COMPLETED, contactId);
                }
            }
        }

        // 재고 확인 (공동구매 인벤토리 노드)
        if (flowData.has("inventory")) {
            JsonNode inventoryNode = flowData.get("inventory");
            if (inventoryNode.path("enabled").asBoolean(false)) {
                trackNode(flow.getId(), "inventory", NodeExecution.Action.ENTERED, contactId);
                boolean stockOk = executeInventoryCheck(inventoryNode, flow, igAccount,
                        senderIgId, accessToken, botIgId, contact, contactId, triggerKeyword);
                if (!stockOk) {
                    trackNode(flow.getId(), "inventory", NodeExecution.Action.DROPPED, contactId,
                            "{\"reason\":\"sold_out\"}");
                    return; // 매진 → 플로우 중단
                }
                trackNode(flow.getId(), "inventory", NodeExecution.Action.COMPLETED, contactId);
            }
        }

        // A/B 테스트 분기
        String abVariant = null;
        if (flowData.has("abtest")) {
            JsonNode abtestNode = flowData.get("abtest");
            if (abtestNode.path("enabled").asBoolean(false)) {
                String testName = abtestNode.path("testName").asText("기본 테스트");
                int variantA = abtestNode.path("variantA").asInt(50);
                trackNode(flow.getId(), "abtest", NodeExecution.Action.ENTERED, contactId);
                abVariant = abTestService.assignVariant(flow.getId(), testName, variantA);
                trackNode(flow.getId(), "abtest", NodeExecution.Action.COMPLETED, contactId,
                        "{\"variant\":\"" + abVariant + "\",\"testName\":\"" + testName + "\"}");
                log.info("A/B 테스트 분기: flow={}, test={}, variant={}", flow.getId(), testName, abVariant);
            }
        }

        // 메인 DM 발송
        if (flowData.has("mainDm")) {
            trackNode(flow.getId(), "mainDm", NodeExecution.Action.ENTERED, contactId);
            executeMainDm(flowData.get("mainDm"), botIgId, senderIgId, accessToken, contact, triggerKeyword);
            String processedMessage = replaceVariables(
                    flowData.get("mainDm").path("message").asText(""), contact, triggerKeyword);
            conversationService.saveOutboundMessage(
                    igAccount.getUser(), senderIgId, processedMessage, true, flow.getName());
            trackNode(flow.getId(), "mainDm", NodeExecution.Action.COMPLETED, contactId);

            // A/B 테스트 완료 추적
            if (abVariant != null && flowData.has("abtest")) {
                String testName = flowData.get("abtest").path("testName").asText("기본 테스트");
                abTestService.markCompleted(flow.getId(), testName, abVariant);
            }
        }

        // 캐러셀 메시지 발송
        if (flowData.has("carousel")) {
            trackNode(flow.getId(), "carousel", NodeExecution.Action.ENTERED, contactId);
            executeCarousel(flowData.get("carousel"), botIgId, senderIgId, accessToken,
                    igAccount.getUser(), flow.getName(), contact, triggerKeyword);
            trackNode(flow.getId(), "carousel", NodeExecution.Action.COMPLETED, contactId);
        }

        // AI 자동 응답 실행
        if (flowData.has("aiResponse")) {
            trackNode(flow.getId(), "aiResponse", NodeExecution.Action.ENTERED, contactId);
            executeAIResponse(flowData.get("aiResponse"), flow, igAccount, senderIgId, triggerKeyword, contact);
            trackNode(flow.getId(), "aiResponse", NodeExecution.Action.COMPLETED, contactId);
        }

        // Recurring Notification 옵트인 요청
        if (flowData.has("optIn")) {
            JsonNode optInNode = flowData.get("optIn");
            if (optInNode.path("enabled").asBoolean(false)) {
                trackNode(flow.getId(), "optIn", NodeExecution.Action.ENTERED, contactId);
                executeOptIn(optInNode, igAccount, senderIgId, contact, triggerKeyword);
                trackNode(flow.getId(), "optIn", NodeExecution.Action.COMPLETED, contactId);
            }
        }

        // 팔로업 메시지 스케줄링 (DB에 영구 저장, 변수는 발송 시점에 치환)
        if (flowData.has("followUp")) {
            trackNode(flow.getId(), "followUp", NodeExecution.Action.ENTERED, contactId);
            scheduleFollowUp(flowData.get("followUp"), igAccount, senderIgId);
            trackNode(flow.getId(), "followUp", NodeExecution.Action.COMPLETED, contactId);
        }

        // 카카오 알림톡/친구톡 발송
        if (flowData.has("kakao")) {
            JsonNode kakaoNode = flowData.get("kakao");
            if (kakaoNode.path("enabled").asBoolean(false)) {
                trackNode(flow.getId(), "kakao", NodeExecution.Action.ENTERED, contactId);
                executeKakao(kakaoNode, igAccount.getUser().getId(), contact, triggerKeyword);
                trackNode(flow.getId(), "kakao", NodeExecution.Action.COMPLETED, contactId);
            }
        }

        log.info("메인DM + 팔로업 완료: flowId={}, sender={}", flow.getId(), senderIgId);
    }

    // ═══════════════════════════════════════════════════════════
    // 개별 단계 실행
    // ═══════════════════════════════════════════════════════════

    private void executeCommentReply(JsonNode commentReplyNode, String commentId, String accessToken,
                                      Contact contact, String triggerKeyword) {
        if (!commentReplyNode.path("enabled").asBoolean(false)) return;

        JsonNode replies = commentReplyNode.get("replies");
        if (replies == null || !replies.isArray() || replies.isEmpty()) return;

        int idx = new Random().nextInt(replies.size());
        String reply = replaceVariables(replies.get(idx).asText(), contact, triggerKeyword);

        // 답글 딜레이 (봇 의심 방지)
        int replyDelayMax = commentReplyNode.path("replyDelay").asInt(0);
        if (replyDelayMax > 0) {
            int minDelay = Math.max(1, replyDelayMax / 3);
            int actualDelay = minDelay + new Random().nextInt(replyDelayMax - minDelay + 1);
            try {
                log.debug("댓글 답장 딜레이: {}초", actualDelay);
                Thread.sleep(actualDelay * 1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        try {
            instagramApiService.replyToComment(commentId, reply, accessToken);
            log.debug("댓글 답장 완료: commentId={}, variant={}/{}", commentId, idx + 1, replies.size());
        } catch (Exception e) {
            log.error("댓글 답장 실패: {}", e.getMessage());
        }
    }

    /**
     * @return 오프닝DM이 실제로 발송되었으면 true
     */
    private boolean executeOpeningDm(JsonNode openingDmNode, String botIgId, String recipientId,
                                      String accessToken, Contact contact, String triggerKeyword,
                                      String commentId) {
        if (!openingDmNode.path("enabled").asBoolean(false)) return false;

        String message = replaceVariables(openingDmNode.path("message").asText(""), contact, triggerKeyword);
        String buttonText = openingDmNode.path("buttonText").asText("");

        if (message.isBlank()) return false;

        boolean hasComment = commentId != null && !commentId.isBlank();
        boolean hasButton = !buttonText.isBlank();

        // 댓글 트리거: Private Reply 로 1번에 텍스트+버튼 발송 — Instagram 24h 창은 실제로
        // "사용자가 응답/버튼 클릭"해야만 열리므로, 후속 DM(메인/팔로업)이 막히지 않으려면
        // 오프닝 DM 에 반드시 버튼을 포함해 사용자 상호작용을 유도해야 함.
        // generic_template (postback 버튼) 은 Private Reply 에서 허용되는 몇 안되는 구조 중 하나.
        try {
            if (hasComment && hasButton) {
                instagramApiService.sendPrivateReplyWithPostbackButton(
                        botIgId, commentId, message, buttonText, "OPENING_DM_CLICKED", accessToken);
            } else if (hasComment) {
                // 버튼 없는 경우 — 단순 텍스트 Private Reply. 사용자 응답 없으면 창 안 열림.
                instagramApiService.sendPrivateReplyToComment(botIgId, commentId, message, accessToken);
            } else if (hasButton) {
                // 비-댓글(DM keyword 등) 트리거 — 창이 이미 열린 상태라도 UI 일관성(카드 안 버튼) +
                // postback 이벤트로 깔끔히 수신되도록 generic_template 사용.
                instagramApiService.sendGenericTemplateWithPostback(
                        botIgId, recipientId, message, buttonText, "OPENING_DM_CLICKED", accessToken);
            } else {
                instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
            }
            log.info("오프닝 DM 발송 완료: recipient={}, privateReply={}, hasButton={}",
                    recipientId, hasComment, hasButton);
            return true;
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: recipient={}, privateReply={}, hasButton={}, error={}",
                    recipientId, hasComment, hasButton, e.getMessage());
            return false;
        }
    }

    private void executeMainDm(JsonNode mainDmNode, String botIgId, String recipientId,
                                String accessToken, Contact contact, String triggerKeyword) {
        String message = replaceVariables(mainDmNode.path("message").asText(""), contact, triggerKeyword);
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
     * 캐러셀(다중 카드) 메시지 발송
     * Instagram Generic Template elements로 변환하여 전송
     */
    private void executeCarousel(JsonNode carouselNode, String botIgId, String recipientId,
                                  String accessToken, User user, String flowName,
                                  Contact contact, String triggerKeyword) {
        if (!carouselNode.path("enabled").asBoolean(false)) return;

        JsonNode cards = carouselNode.get("cards");
        if (cards == null || !cards.isArray() || cards.isEmpty()) return;

        try {
            List<Map<String, Object>> cardList = new ArrayList<>();
            for (JsonNode card : cards) {
                String title = replaceVariables(card.path("title").asText(""), contact, triggerKeyword);
                if (title.isBlank()) continue; // title은 필수

                Map<String, Object> cardMap = new LinkedHashMap<>();
                cardMap.put("title", title);
                cardMap.put("subtitle", replaceVariables(card.path("subtitle").asText(""), contact, triggerKeyword));
                cardMap.put("imageUrl", card.path("imageUrl").asText(""));
                cardMap.put("buttonText", replaceVariables(card.path("buttonText").asText(""), contact, triggerKeyword));
                cardMap.put("buttonUrl", card.path("buttonUrl").asText(""));
                cardList.add(cardMap);
            }

            if (cardList.isEmpty()) return;

            instagramApiService.sendCarouselMessage(botIgId, recipientId, cardList, accessToken);

            // 대화 기록 저장 (첫 번째 카드 제목을 요약으로)
            String summary = "[캐러셀] " + cardList.get(0).get("title")
                    + (cardList.size() > 1 ? " 외 " + (cardList.size() - 1) + "장" : "");
            conversationService.saveOutboundMessage(user, recipientId, summary, true, flowName);

            log.debug("캐러셀 발송 완료: recipient={}, cards={}", recipientId, cardList.size());
        } catch (Exception e) {
            log.error("캐러셀 발송 실패: {}", e.getMessage());
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

    /**
     * AI 자동 응답 노드 실행
     * FAQ 키워드 매칭 또는 OpenAI 스마트 응답 생성 후 DM 발송
     */
    private void executeAIResponse(JsonNode aiResponseNode, Flow flow, InstagramAccount igAccount,
                                    String senderIgId, String triggerKeyword, Contact contact) {
        if (!aiResponseNode.path("enabled").asBoolean(false)) return;

        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();
        Long userId = igAccount.getUser().getId();

        // 트리거 키워드를 사용자 메시지로 활용
        String userMessage = triggerKeyword != null ? triggerKeyword : "";
        if (userMessage.isBlank()) return;

        // 이전 대화 기록 조회 (컨텍스트용)
        List<String> history = Collections.emptyList();
        try {
            history = conversationService.getRecentMessages(userId, senderIgId,
                    aiResponseNode.path("contextWindow").asInt(3));
        } catch (Exception e) {
            log.debug("대화 기록 조회 실패: {}", e.getMessage());
        }

        // AI 응답 생성
        String response = aiService.executeAIResponse(userId, userMessage, aiResponseNode, history, contact);

        // 실패 시 fallback
        if (response == null || response.isBlank()) {
            response = aiService.getFallbackResponse(aiResponseNode);
        }

        // 변수 치환 후 발송
        response = replaceVariables(response, contact, triggerKeyword);

        try {
            instagramApiService.sendTextMessage(botIgId, senderIgId, response, accessToken);
            conversationService.saveOutboundMessage(
                    igAccount.getUser(), senderIgId, response, true, flow.getName() + " (AI)");
            log.info("AI 응답 발송 완료: flowId={}, sender={}, mode={}",
                    flow.getId(), senderIgId, aiResponseNode.path("mode").asText("faq"));
        } catch (Exception e) {
            log.error("AI 응답 발송 실패: {}", e.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 유틸리티
    // ═══════════════════════════════════════════════════════════

    /**
     * 첫 팔로우 요청: 안내 메시지 + "✅ 팔로우 했어요" 버튼
     */
    private void sendFollowRequestMessage(JsonNode followCheck, String botIgId, String senderIgId,
                                            String accessToken, InstagramAccount igAccount, Flow flow,
                                            Contact contact) {
        String followMsg = replaceVariables(
                followCheck.path("message").asText("링크를 받으시려면 먼저 팔로우를 해주세요!"), contact, null);
        try {
            List<Map<String, String>> quickReplies = List.of(
                    Map.of("title", "✅ 팔로우 했어요", "payload", "FOLLOW_CHECK")
            );
            instagramApiService.sendQuickReplyMessage(botIgId, senderIgId, followMsg, quickReplies, accessToken);
            conversationService.saveOutboundMessage(
                    igAccount.getUser(), senderIgId, followMsg, true, flow.getName());
        } catch (Exception e) {
            log.error("팔로우 요청 메시지 발송 실패: {}", e.getMessage());
        }
    }

    /**
     * 팔로우 재확인 실패: "확인되지 않았어요" 메시지 + "✅ 팔로우 했어요" 재시도 버튼
     */
    private void sendFollowRetryMessage(String botIgId, String senderIgId,
                                          String accessToken, InstagramAccount igAccount, Flow flow) {
        String retryMsg = "팔로우가 확인되지 않았어요! 😅\n팔로우 후 아래 버튼을 다시 눌러주세요.";
        try {
            List<Map<String, String>> quickReplies = List.of(
                    Map.of("title", "✅ 팔로우 했어요", "payload", "FOLLOW_CHECK")
            );
            instagramApiService.sendQuickReplyMessage(botIgId, senderIgId, retryMsg, quickReplies, accessToken);
            conversationService.saveOutboundMessage(
                    igAccount.getUser(), senderIgId, retryMsg, true, flow.getName());
        } catch (Exception e) {
            log.error("팔로우 재확인 메시지 발송 실패: {}", e.getMessage());
        }
    }

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
        savePendingAction(flow, igAccount, senderIgId, commentId, step, null);
    }

    @Transactional
    private void savePendingAction(Flow flow, InstagramAccount igAccount,
                                    String senderIgId, String commentId, PendingStep step,
                                    String triggerKeyword) {
        savePendingAction(flow, igAccount, senderIgId, commentId, step, triggerKeyword, null);
    }

    @Transactional
    private void savePendingAction(Flow flow, InstagramAccount igAccount,
                                    String senderIgId, String commentId, PendingStep step,
                                    String triggerKeyword, String currentNodeId) {
        PendingFlowAction action = PendingFlowAction.builder()
                .flow(flow)
                .instagramAccount(igAccount)
                .senderIgId(senderIgId)
                .commentId(commentId)
                .triggerKeyword(triggerKeyword)
                .currentNodeId(currentNodeId)
                .pendingStep(step)
                // 2시간 만료 — 24시간은 사용자가 포기한 이후에도 계속 active 취급돼
                // 새 DM 트리거를 차단하는 부작용이 있었음. 2시간이면 사용자 세션 관점에서
                // 충분하고, 새 키워드 DM 온 경우엔 WebhookEventService 가 즉시 폐기하므로
                // 만료 자체가 문제 되는 경우는 드뭄.
                .expiresAt(LocalDateTime.now().plusHours(2))
                .build();
        pendingFlowActionRepository.save(action);
    }

    // ═══════════════════════════════════════════════════════════
    // v2 그래프 순회 엔진
    // ═══════════════════════════════════════════════════════════

    /**
     * v2 플로우 실행 진입점
     */
    private void executeFlowV2(Flow flow, InstagramAccount igAccount, String senderIgId,
                                String triggerText, String commentId, JsonNode flowData) {
        FlowGraph graph = FlowGraphParser.parse(flowData.toString());
        if (graph.getTriggerNodeId() == null) {
            log.warn("v2 플로우에 트리거 노드 없음: flowId={}", flow.getId());
            return;
        }

        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();
        Contact contact = findContact(igAccount.getUser().getId(), senderIgId);

        FlowContext ctx = FlowContext.builder()
                .flow(flow)
                .igAccount(igAccount)
                .senderIgId(senderIgId)
                .commentId(commentId)
                .triggerKeyword(triggerText)
                .contact(contact)
                .accessToken(accessToken)
                .botIgId(botIgId)
                .build();

        executeFlowGraph(graph, ctx, graph.getTriggerNodeId());
        incrementSentCount(flow);
        log.info("v2 플로우 실행 완료: flowId={}", flow.getId());
    }

    /**
     * 그래프 순회 실행 루프
     */
    private void executeFlowGraph(FlowGraph graph, FlowContext ctx, String startNodeId) {
        String currentId = startNodeId;
        Long contactId = ctx.getContact() != null ? ctx.getContact().getId() : null;

        while (currentId != null && ctx.getStepCount() < MAX_GRAPH_STEPS) {
            FlowNode node = graph.getNode(currentId);
            if (node == null) {
                log.warn("노드를 찾을 수 없음: nodeId={}", currentId);
                break;
            }

            // 순환 방지
            if (ctx.getVisitedNodeIds().contains(currentId)) {
                log.warn("순환 감지 — 그래프 순회 중단: nodeId={}", currentId);
                break;
            }
            ctx.getVisitedNodeIds().add(currentId);
            ctx.setStepCount(ctx.getStepCount() + 1);

            // 노드 실행 추적
            trackNode(ctx.getFlow().getId(), node.getType(), NodeExecution.Action.ENTERED, contactId);

            // 노드 실행
            NodeExecutor exec = nodeExecutorRegistry.get(node.getType());
            NodeExecResult result = exec.execute(ctx, node);

            trackNode(ctx.getFlow().getId(), node.getType(), NodeExecution.Action.COMPLETED, contactId);

            // 결과 처리
            if (result.isHaltFlow()) {
                log.info("노드에서 플로우 중단: nodeId={}, type={}", currentId, node.getType());
                break;
            }

            if (result.isAwaitUser()) {
                // 사용자 응답 대기 → PendingFlowAction 저장 후 중단
                savePendingAction(ctx.getFlow(), ctx.getIgAccount(), ctx.getSenderIgId(),
                        ctx.getCommentId(), result.getAwaitStep(), ctx.getTriggerKeyword(), currentId);

                // AWAITING_DELAY인 경우 scheduledResumeAt 설정
                if (result.getAwaitStep() == PendingStep.AWAITING_DELAY) {
                    String delayMin = String.valueOf(ctx.getVariables().getOrDefault("delayMinutes", "30"));
                    long minutes = Long.parseLong(delayMin);
                    PendingFlowAction lastPending = pendingFlowActionRepository
                            .findFirstBySenderIgIdAndPendingStepOrderByCreatedAtDesc(
                                    ctx.getSenderIgId(), PendingStep.AWAITING_DELAY)
                            .orElse(null);
                    if (lastPending != null) {
                        lastPending.setScheduledResumeAt(LocalDateTime.now().plusMinutes(minutes));
                        pendingFlowActionRepository.save(lastPending);
                    }
                    log.info("딜레이 대기 저장: nodeId={}, resumeAt={}분 후", currentId, delayMin);
                } else {
                    log.info("사용자 응답 대기: nodeId={}, step={}", currentId, result.getAwaitStep());
                }
                break;
            }

            // 다음 노드 선택
            currentId = graph.chooseNext(currentId, result.getBranch());
        }

        if (ctx.getStepCount() >= MAX_GRAPH_STEPS) {
            log.warn("MAX_GRAPH_STEPS({}) 도달 — 플로우 강제 종료: flowId={}",
                    MAX_GRAPH_STEPS, ctx.getFlow().getId());
        }
    }

    /**
     * PendingFlowAction 해소 후 그래프 순회 재개 (branch 없이 — postback 등)
     */
    private void resumeFlowGraph(Flow flow, InstagramAccount igAccount, String senderIgId,
                                  String triggerKeyword, String currentNodeId, String commentId) {
        resumeFlowGraph(flow, igAccount, senderIgId, triggerKeyword, currentNodeId, commentId, null);
    }

    /**
     * PendingFlowAction 해소 후 그래프 순회 재개
     * @param branch 이전 노드의 결과 분기 (null이면 기본 엣지)
     */
    private void resumeFlowGraph(Flow flow, InstagramAccount igAccount, String senderIgId,
                                  String triggerKeyword, String currentNodeId, String commentId,
                                  String branch) {
        try {
            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            FlowGraph graph = FlowGraphParser.parse(flowData.toString());

            String accessToken = instagramApiService.getDecryptedToken(igAccount);
            String botIgId = igAccount.getIgUserId();
            Contact contact = findContact(igAccount.getUser().getId(), senderIgId);

            FlowContext ctx = FlowContext.builder()
                    .flow(flow)
                    .igAccount(igAccount)
                    .senderIgId(senderIgId)
                    .commentId(commentId)
                    .triggerKeyword(triggerKeyword)
                    .contact(contact)
                    .accessToken(accessToken)
                    .botIgId(botIgId)
                    .build();

            // 현재 노드에서 다음 노드로 진행
            String nextNodeId = graph.chooseNext(currentNodeId, branch);
            if (nextNodeId != null) {
                executeFlowGraph(graph, ctx, nextNodeId);
            }

            log.info("v2 그래프 순회 재개 완료: flowId={}, resumeFrom={}", flow.getId(), currentNodeId);
        } catch (Exception e) {
            log.error("v2 그래프 순회 재개 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    /**
     * 딜레이 노드 재개 — 스케줄러에서 호출
     */
    public void resumeAfterDelay(PendingFlowAction action) {
        resumeFlowGraph(
                action.getFlow(),
                action.getInstagramAccount(),
                action.getSenderIgId(),
                action.getTriggerKeyword(),
                action.getCurrentNodeId(),
                action.getCommentId()
        );
    }

    // ─── Recurring Notification 옵트인 노드 ───

    /**
     * 사용자에게 Recurring Notification 옵트인 요청 DM 발송
     */
    private void executeOptIn(JsonNode optInNode, InstagramAccount igAccount,
                               String senderIgId, Contact contact, String triggerKeyword) {
        String topic = optInNode.path("topic").asText("general");
        String topicLabel = optInNode.path("topicLabel").asText("소식 알림");
        String message = replaceVariables(
                optInNode.path("message").asText("새 소식을 받아보시겠어요?"), contact, triggerKeyword);
        String frequency = optInNode.path("frequency").asText("WEEKLY");

        try {
            recurringNotificationService.requestOptIn(
                    igAccount, senderIgId, message, topic, topicLabel, frequency);
            log.info("OptIn 요청 발송: topic={}, sender={}", topic, senderIgId);
        } catch (Exception e) {
            log.error("OptIn 요청 실패: topic={}, error={}", topic, e.getMessage());
        }
    }

    // ─── 재고 확인 (인벤토리 노드) ───

    /**
     * 카카오 알림톡/친구톡 발송 노드 실행
     */
    private void executeKakao(JsonNode kakaoNode, Long userId, Contact contact, String triggerKeyword) {
        // customFields JSON에서 phone 추출
        String phone = null;
        if (contact.getCustomFields() != null) {
            try {
                JsonNode fields = objectMapper.readTree(contact.getCustomFields());
                phone = fields.path("phone").asText(null);
            } catch (Exception ignored) {}
        }
        if (phone == null || phone.isBlank()) {
            log.warn("카카오 발송 실패: 연락처에 전화번호 없음, contactId={}", contact.getId());
            return;
        }

        String kakaoType = kakaoNode.path("kakaoType").asText("alimtalk");
        if ("alimtalk".equals(kakaoType)) {
            String templateCode = kakaoNode.path("templateCode").asText("");
            java.util.Map<String, String> vars = new java.util.HashMap<>();
            vars.put("name", contact.getName() != null ? contact.getName() : "고객");
            vars.put("keyword", triggerKeyword != null ? triggerKeyword : "");
            kakaoChannelService.sendAlimtalk(userId, templateCode, phone, vars);
        } else {
            String message = replaceVariables(
                    kakaoNode.path("message").asText(""), contact, triggerKeyword);
            String imageUrl = kakaoNode.path("imageUrl").asText(null);
            kakaoChannelService.sendFriendtalk(userId, phone, message, imageUrl);
        }
    }

    /**
     * 공동구매 재고 확인 노드 실행
     * - 재고 있으면 참여자 등록 후 true 반환
     * - 매진이면 매진 메시지 발송 후 false 반환
     */
    private boolean executeInventoryCheck(JsonNode inventoryNode, Flow flow, InstagramAccount igAccount,
                                           String senderIgId, String accessToken, String botIgId,
                                           Contact contact, Long contactId, String triggerKeyword) {
        long groupBuyId = inventoryNode.path("groupBuyId").asLong(0);
        if (groupBuyId == 0) {
            log.warn("인벤토리 노드에 groupBuyId가 없음: flowId={}", flow.getId());
            return true; // groupBuyId 없으면 통과
        }

        try {
            GroupBuy groupBuy = groupBuyRepository.findById(groupBuyId).orElse(null);
            if (groupBuy == null) {
                log.warn("공동구매를 찾을 수 없음: groupBuyId={}", groupBuyId);
                return true;
            }

            // 재고 확인
            if (!groupBuy.hasStock()) {
                // 매진 메시지 발송
                String soldOutMsg = replaceVariables(
                        inventoryNode.path("soldOutMessage").asText("죄송합니다, 이 상품은 매진되었습니다. 😢"),
                        contact, triggerKeyword);
                try {
                    instagramApiService.sendTextMessage(botIgId, senderIgId, soldOutMsg, accessToken);
                    conversationService.saveOutboundMessage(
                            igAccount.getUser(), senderIgId, soldOutMsg, true, flow.getName());
                } catch (Exception e) {
                    log.error("매진 메시지 발송 실패: {}", e.getMessage());
                }
                log.info("공동구매 매진: groupBuyId={}, sender={}", groupBuyId, senderIgId);
                return false;
            }

            // 참여자 등록 (기본 수량 1, 옵션은 나중에 선택)
            if (contactId != null) {
                try {
                    groupBuyService.addParticipant(groupBuyId, contactId, null, 1);
                    log.info("공동구매 참여 등록: groupBuyId={}, contactId={}", groupBuyId, contactId);
                } catch (Exception e) {
                    // 이미 참여한 경우 등 → 플로우는 계속 진행
                    log.info("공동구매 참여 등록 스킵: {}", e.getMessage());
                }
            }

            // 결제 링크가 있으면 메인DM 링크로 자동 삽입 (flowData의 mainDm.links에 반영됨)
            // → 결제 링크는 프론트엔드에서 flowData 저장 시 mainDm.links에 포함하므로 여기서는 별도 처리 불필요

            return true;

        } catch (Exception e) {
            log.error("인벤토리 노드 실행 실패: {}", e.getMessage());
            return true; // 오류 시 통과 (플로우 중단 방지)
        }
    }

    // ─── 메시지 변수 치환 ───

    private static final Pattern VARIABLE_PATTERN = Pattern.compile(
            "\\{(이름|name|username|키워드|keyword|날짜|date|custom\\.[\\w]+)\\}");

    private static final DateTimeFormatter KOREAN_DATE_FORMAT =
            DateTimeFormatter.ofPattern("M월 d일");

    /**
     * 고급 조건 평가 (즉시 평가형)
     * @return true = 통과, false = 실패 (플로우 중단)
     */
    private boolean evaluateCondition(JsonNode cond, Contact contact) {
        String type = cond.path("type").asText("");

        return switch (type) {
            case "tagCheck" -> {
                String tagName = cond.path("tagName").asText("").trim();
                if (tagName.isEmpty()) yield true; // 태그 미설정 시 통과
                yield contact != null && contact.getTags() != null && contact.getTags().contains(tagName);
            }
            case "customField" -> {
                String fieldName = cond.path("fieldName").asText("").trim();
                if (fieldName.isEmpty()) yield true;
                String operator = cond.path("operator").asText("equals");
                String expected = cond.path("fieldValue").asText("");
                String actual = getCustomFieldValue(contact, fieldName);

                yield switch (operator) {
                    case "equals" -> expected.equals(actual);
                    case "not_equals" -> !expected.equals(actual);
                    case "contains" -> actual != null && actual.contains(expected);
                    case "gt" -> compareNumeric(actual, expected) > 0;
                    case "gte" -> compareNumeric(actual, expected) >= 0;
                    case "lt" -> compareNumeric(actual, expected) < 0;
                    case "lte" -> compareNumeric(actual, expected) <= 0;
                    case "exists" -> actual != null && !actual.isEmpty();
                    default -> true;
                };
            }
            case "timeRange" -> {
                int startHour = cond.path("startHour").asInt(9);
                int endHour = cond.path("endHour").asInt(18);
                java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
                int currentHour = now.getHour();
                int currentDow = now.getDayOfWeek().getValue() - 1; // 0=월 ~ 6=일

                // 요일 체크
                JsonNode activeDays = cond.get("activeDays");
                if (activeDays != null && activeDays.isArray() && !activeDays.isEmpty()) {
                    boolean dayMatch = false;
                    for (JsonNode d : activeDays) {
                        if (d.asInt(-1) == currentDow) { dayMatch = true; break; }
                    }
                    if (!dayMatch) yield false;
                }

                // 시간 체크 (같으면 24시간 활성, startHour < endHour: 같은날, 초과: 자정 걸침)
                if (startHour == endHour) {
                    yield true; // 동일 시간 = 24시간 활성
                } else if (startHour < endHour) {
                    yield currentHour >= startHour && currentHour < endHour;
                } else {
                    yield currentHour >= startHour || currentHour < endHour;
                }
            }
            case "random" -> {
                int probability = cond.path("probability").asInt(50);
                yield java.util.concurrent.ThreadLocalRandom.current().nextInt(100) < probability;
            }
            default -> true;
        };
    }

    private int compareNumeric(String actual, String expected) {
        try {
            double a = actual != null ? Double.parseDouble(actual) : 0;
            double e = Double.parseDouble(expected);
            return Double.compare(a, e);
        } catch (NumberFormatException e) {
            // 숫자가 아닌 경우 문자열 비교
            return (actual != null ? actual : "").compareTo(expected);
        }
    }

    /**
     * 메시지 템플릿의 변수를 실제 값으로 치환
     * 지원 변수: {이름}/{name}, {username}, {키워드}/{keyword}, {날짜}/{date}, {custom.필드명}
     */
    private String replaceVariables(String template, Contact contact, String triggerKeyword) {
        if (template == null || template.isBlank()) return template;

        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String varName = matcher.group(1);
            String replacement = switch (varName) {
                case "이름", "name" -> contact != null && contact.getName() != null
                        ? contact.getName() : "고객";
                case "username" -> contact != null && contact.getUsername() != null
                        ? "@" + contact.getUsername() : "";
                case "키워드", "keyword" -> triggerKeyword != null ? triggerKeyword : "";
                case "날짜", "date" -> LocalDateTime.now().format(KOREAN_DATE_FORMAT);
                default -> {
                    // {custom.필드명} 처리
                    if (varName.startsWith("custom.") && contact != null) {
                        yield getCustomFieldValue(contact, varName.substring(7));
                    }
                    yield matcher.group(0); // 매칭 안 되면 원본 유지
                }
            };
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);

        return result.toString();
    }

    /**
     * Contact의 customFields JSON에서 특정 필드 값을 추출
     */
    private String getCustomFieldValue(Contact contact, String fieldName) {
        if (contact == null) return "";
        String customFields = contact.getCustomFields();
        if (customFields == null || customFields.isBlank()) return "";
        try {
            JsonNode fields = objectMapper.readTree(customFields);
            return fields.path(fieldName).asText("");
        } catch (Exception e) {
            log.debug("커스텀 필드 파싱 실패: {}", e.getMessage());
            return "";
        }
    }

    /**
     * senderIgId로 Contact를 조회 (변수 치환용)
     */
    private Contact findContact(Long userId, String senderIgId) {
        return contactRepository.findByUserIdAndIgUserId(userId, senderIgId).orElse(null);
    }

    /**
     * Contact 가 없으면 Instagram Graph API 로 프로필(username/name/profile_pic) 조회해서 생성.
     * 댓글 트리거 첫 진입 시 호출 — 라이브 채팅에 PSID 가 아닌 사람 이름/아이디가 보이도록 함.
     * 프로필 조회 실패해도 조용히 PSID 기반 최소 Contact 라도 생성해서 후속 저장이 막히지 않게 한다.
     */
    private void ensureContactWithProfile(User user, String senderIgId, String accessToken) {
        if (contactRepository.findByUserIdAndIgUserId(user.getId(), senderIgId).isPresent()) return;

        String username = senderIgId;
        String name = null;
        String profilePic = null;
        try {
            JsonNode profile = instagramApiService.fetchUserProfile(senderIgId, accessToken);
            if (profile != null) {
                String fetchedUsername = profile.path("username").asText("");
                String fetchedName = profile.path("name").asText("");
                String fetchedPic = profile.path("profile_pic").asText("");
                if (!fetchedUsername.isBlank()) username = fetchedUsername;
                if (!fetchedName.isBlank()) name = fetchedName;
                if (!fetchedPic.isBlank()) profilePic = fetchedPic;
            }
        } catch (Exception e) {
            log.debug("프로필 조회 실패 — PSID 기반 Contact 생성: sender={}, error={}", senderIgId, e.getMessage());
        }

        Contact.ContactBuilder builder = Contact.builder()
                .user(user)
                .igUserId(senderIgId)
                .username(username);
        if (name != null) builder.name(name);
        if (profilePic != null) builder.profilePictureUrl(profilePic);
        contactRepository.save(builder.build());
        log.info("Contact 생성: user={}, sender={}, username={}, name={}", user.getId(), senderIgId, username, name);
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

    // ═══════════════════════════════════════════════════════════
    // 노드별 실행 추적 (퍼널 분석용)
    // ═══════════════════════════════════════════════════════════

    private void trackNode(Long flowId, String nodeType, NodeExecution.Action action, Long contactId, String metadata) {
        try {
            nodeExecutionRepository.save(NodeExecution.builder()
                    .flowId(flowId)
                    .nodeType(nodeType)
                    .action(action)
                    .contactId(contactId)
                    .metadata(metadata)
                    .build());
        } catch (Exception e) {
            log.warn("노드 실행 추적 실패 (무시): nodeType={}, error={}", nodeType, e.getMessage());
        }
    }

    private void trackNode(Long flowId, String nodeType, NodeExecution.Action action, Long contactId) {
        trackNode(flowId, nodeType, action, contactId, null);
    }
}
