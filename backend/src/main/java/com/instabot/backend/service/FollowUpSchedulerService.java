package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.ScheduledFollowUp;
import com.instabot.backend.entity.PendingFlowAction;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.PendingFlowActionRepository;
import com.instabot.backend.repository.ScheduledFollowUpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 팔로업 메시지 스케줄러
 * - 매분 DB를 폴링하여 발송 시간이 된 팔로업 메시지 처리
 * - 만료된 PendingFlowAction 정리
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FollowUpSchedulerService {

    private final ScheduledFollowUpRepository scheduledFollowUpRepository;
    private final PendingFlowActionRepository pendingFlowActionRepository;
    private final InstagramApiService instagramApiService;
    private final ContactRepository contactRepository;
    private final ObjectMapper objectMapper;
    @org.springframework.context.annotation.Lazy
    private final FlowExecutionService flowExecutionService;

    private static final Pattern VARIABLE_PATTERN = Pattern.compile(
            "\\{(이름|name|username|키워드|keyword|날짜|date|custom\\.[\\w]+)\\}");
    private static final DateTimeFormatter KOREAN_DATE_FORMAT =
            DateTimeFormatter.ofPattern("M월 d일");

    /**
     * 매분 실행: 발송 시간이 된 팔로업 메시지 발송
     */
    @Scheduled(fixedRate = 60_000) // 1분마다
    @Transactional
    public void processScheduledFollowUps() {
        List<ScheduledFollowUp> pendingFollowUps = scheduledFollowUpRepository
                .findByStatusAndScheduledAtBefore(ScheduledFollowUp.Status.PENDING, LocalDateTime.now());

        if (pendingFollowUps.isEmpty()) return;

        log.info("팔로업 발송 처리: {}건", pendingFollowUps.size());

        for (ScheduledFollowUp followUp : pendingFollowUps) {
            try {
                InstagramAccount igAccount = followUp.getInstagramAccount();
                String accessToken = instagramApiService.getDecryptedToken(igAccount);
                String botIgId = igAccount.getIgUserId();

                // 발송 시점에 변수 치환
                Contact contact = contactRepository
                        .findByUserIdAndIgUserId(igAccount.getUser().getId(), followUp.getRecipientIgId())
                        .orElse(null);
                String processedMessage = replaceVariables(followUp.getMessage(), contact);

                instagramApiService.sendTextMessage(
                        botIgId, followUp.getRecipientIgId(), processedMessage, accessToken);

                followUp.setStatus(ScheduledFollowUp.Status.SENT);
                followUp.setSentAt(LocalDateTime.now());
                scheduledFollowUpRepository.save(followUp);

                log.info("팔로업 발송 성공: recipient={}", followUp.getRecipientIgId());

            } catch (Exception e) {
                followUp.setStatus(ScheduledFollowUp.Status.FAILED);
                scheduledFollowUpRepository.save(followUp);
                log.error("팔로업 발송 실패: id={}, error={}", followUp.getId(), e.getMessage());
            }
        }
    }

    /**
     * 메시지 변수 치환 (팔로업 발송 시점)
     */
    private String replaceVariables(String template, Contact contact) {
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
                case "키워드", "keyword" -> ""; // 팔로업 시점에는 키워드 없음
                case "날짜", "date" -> LocalDateTime.now().format(KOREAN_DATE_FORMAT);
                default -> {
                    if (varName.startsWith("custom.") && contact != null) {
                        yield getCustomFieldValue(contact, varName.substring(7));
                    }
                    yield matcher.group(0);
                }
            };
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private String getCustomFieldValue(Contact contact, String fieldName) {
        String customFields = contact.getCustomFields();
        if (customFields == null || customFields.isBlank()) return "";
        try {
            JsonNode fields = objectMapper.readTree(customFields);
            return fields.path(fieldName).asText("");
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * 매분 실행: 딜레이 노드의 재개 시각이 도래한 플로우 자동 재개
     */
    @Scheduled(fixedRate = 60_000) // 1분마다
    @Transactional
    public void processDelayResumes() {
        List<PendingFlowAction> delayActions = pendingFlowActionRepository
                .findDelayActionsReadyToResume(LocalDateTime.now());

        if (delayActions.isEmpty()) return;

        log.info("딜레이 재개 처리: {}건", delayActions.size());

        for (PendingFlowAction action : delayActions) {
            try {
                action.setPendingStep(PendingFlowAction.PendingStep.COMPLETED);
                pendingFlowActionRepository.save(action);

                // FlowExecutionService에서 그래프 순회 재개
                flowExecutionService.resumeAfterDelay(action);

                log.info("딜레이 재개 성공: flowId={}, sender={}, nodeId={}",
                        action.getFlow().getId(), action.getSenderIgId(), action.getCurrentNodeId());
            } catch (Exception e) {
                log.error("딜레이 재개 실패: id={}, error={}", action.getId(), e.getMessage());
            }
        }
    }

    /**
     * 매시간 실행: 만료된 PendingFlowAction 및 완료된 항목 정리
     */
    @Scheduled(fixedRate = 3_600_000) // 1시간마다
    @Transactional
    public void cleanupExpiredActions() {
        int deleted = pendingFlowActionRepository.cleanupExpiredActions(LocalDateTime.now());
        if (deleted > 0) {
            log.info("만료/완료된 PendingFlowAction 정리: {}건 삭제", deleted);
        }
    }
}
