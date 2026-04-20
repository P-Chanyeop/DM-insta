package com.instabot.backend.service;

import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * 시퀀스 실행 서비스
 * - Contact에 대해 시퀀스의 각 Step을 순차 실행
 * - Step별 지연시간(delayMinutes) 대기 후 메시지 발송
 * - 조건 분기 / 태그 부여 Step 지원
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SequenceExecutionService {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final ContactRepository contactRepository;
    private final SequenceRepository sequenceRepository;
    private final TaskScheduler taskScheduler;

    /**
     * 특정 Contact에 대해 시퀀스 실행 (비동기)
     * 각 Step의 지연시간을 TaskScheduler로 스케줄링하여 스레드를 차단하지 않음
     */
    @Async
    public void executeSequence(Sequence sequence, Contact contact, InstagramAccount igAccount) {
        if (!sequence.isActive() || igAccount == null || contact.getIgUserId() == null) return;

        List<SequenceStep> steps = sequence.getSteps().stream()
                .sorted(Comparator.comparingInt(SequenceStep::getStepOrder))
                .toList();

        log.info("시퀀스 시작: seqId={}, contact={}, steps={}", sequence.getId(), contact.getId(), steps.size());

        // activeSubscribers 증가 + totalStarted 증가
        sequence.setActiveSubscribers(
                (sequence.getActiveSubscribers() != null ? sequence.getActiveSubscribers() : 0) + 1);
        sequence.setTotalStarted(
                (sequence.getTotalStarted() != null ? sequence.getTotalStarted() : 0) + 1);
        sequenceRepository.save(sequence);

        // 누적 지연시간을 계산하여 각 Step을 스케줄링
        long cumulativeDelayMs = 0;

        for (int i = 0; i < steps.size(); i++) {
            SequenceStep step = steps.get(i);
            final boolean isLastStep = (i == steps.size() - 1);

            // 지연시간 누적
            if (step.getDelayMinutes() > 0) {
                cumulativeDelayMs += step.getDelayMinutes() * 60_000L;
            }

            if (cumulativeDelayMs > 0) {
                // 지연이 있으면 TaskScheduler로 스케줄링 (스레드 차단 없음)
                Instant executeAt = Instant.now().plusMillis(cumulativeDelayMs);
                Long seqId = sequence.getId();
                Long contactId = contact.getId();

                taskScheduler.schedule(() -> {
                    try {
                        // DB에서 최신 상태 조회 (서버 재시작 대비)
                        Contact freshContact = contactRepository.findById(contactId).orElse(null);
                        Sequence freshSeq = sequenceRepository.findById(seqId).orElse(null);
                        if (freshContact == null || freshSeq == null || !freshSeq.isActive()) return;

                        executeStep(step, freshContact, igAccount, freshSeq.getUser());

                        if (isLastStep) {
                            completeSequence(freshSeq);
                        }
                    } catch (Exception e) {
                        log.error("시퀀스 스케줄 Step 실행 실패: stepOrder={}, error={}",
                                step.getStepOrder(), e.getMessage());
                    }
                }, executeAt);

                log.debug("시퀀스 Step 스케줄됨: stepOrder={}, executeAt={}", step.getStepOrder(), executeAt);
            } else {
                // 즉시 실행
                try {
                    executeStep(step, contact, igAccount, sequence.getUser());
                    if (isLastStep) {
                        completeSequence(sequence);
                    }
                } catch (Exception e) {
                    log.error("시퀀스 Step 실행 실패: stepOrder={}, error={}", step.getStepOrder(), e.getMessage());
                }
            }
        }
    }

    private void executeStep(SequenceStep step, Contact contact, InstagramAccount igAccount, User user) {
        switch (step.getType()) {
            case MESSAGE -> executeMessageStep(step, contact, igAccount, user);
            case CONDITION -> {
                if (!evaluateCondition(step, contact)) {
                    log.debug("조건 미충족: stepOrder={}", step.getStepOrder());
                }
            }
            case TAG -> executeTagStep(step, contact);
            case DELAY -> { /* delay is handled by scheduling */ }
            case NOTIFY -> log.info("알림 Step 실행: contact={}, step={}", contact.getId(), step.getName());
        }
    }

    private void completeSequence(Sequence sequence) {
        log.info("시퀀스 완료: seqId={}", sequence.getId());
        sequence.setActiveSubscribers(
                Math.max(0, (sequence.getActiveSubscribers() != null ? sequence.getActiveSubscribers() : 1) - 1));
        sequence.setTotalCompleted(
                (sequence.getTotalCompleted() != null ? sequence.getTotalCompleted() : 0) + 1);
        // completionRate 재계산: 완료 / 시작 * 100
        long started = sequence.getTotalStarted() != null ? sequence.getTotalStarted() : 0;
        long completed = sequence.getTotalCompleted();
        sequence.setCompletionRate(started > 0
                ? Math.round(completed * 1000.0 / started) / 10.0
                : 0.0);
        sequenceRepository.save(sequence);
    }

    private void executeMessageStep(SequenceStep step, Contact contact,
                                     InstagramAccount igAccount, User user) {
        String content = step.getMessageContent();
        if (content == null || content.isBlank()) return;

        // 변수 치환
        content = content.replace("{{username}}", contact.getUsername() != null ? contact.getUsername() : "")
                .replace("{{name}}", contact.getName() != null ? contact.getName() : "");

        instagramApiService.sendTextMessage(
                igAccount.getIgUserId(),
                contact.getIgUserId(),
                content,
                instagramApiService.getDecryptedToken(igAccount)
        );

        conversationService.saveOutboundMessage(user, contact.getIgUserId(), content, true, "시퀀스: " + step.getName());

        log.debug("시퀀스 메시지 발송: stepOrder={}, contact={}", step.getStepOrder(), contact.getId());
    }

    private boolean evaluateCondition(SequenceStep step, Contact contact) {
        String condition = step.getMessageContent(); // 조건을 messageContent에 JSON으로 저장
        if (condition == null) return true;

        // 간단한 조건 평가: "tag:VIP" → VIP 태그 보유 여부
        if (condition.startsWith("tag:")) {
            String tag = condition.substring(4).trim();
            return contact.getTags().contains(tag);
        }

        // "active" → 활성 사용자 여부
        if ("active".equalsIgnoreCase(condition.trim())) {
            return contact.isActive();
        }

        // "messageCount>N" → 메시지 수 조건
        if (condition.contains("messageCount>")) {
            try {
                int threshold = Integer.parseInt(condition.replace("messageCount>", "").trim());
                return contact.getMessageCount() > threshold;
            } catch (NumberFormatException e) {
                return true;
            }
        }

        return true;
    }

    private void executeTagStep(SequenceStep step, Contact contact) {
        String tagContent = step.getMessageContent();
        if (tagContent == null || tagContent.isBlank()) return;

        Set<String> tags = contact.getTags();
        if (tagContent.startsWith("-")) {
            tags.remove(tagContent.substring(1).trim());
        } else {
            tags.add(tagContent.trim());
        }
        contactRepository.save(contact);

        log.debug("태그 변경: contact={}, tag={}", contact.getId(), tagContent);
    }
}
