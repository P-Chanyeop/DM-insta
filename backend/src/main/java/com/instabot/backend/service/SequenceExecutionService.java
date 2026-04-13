package com.instabot.backend.service;

import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

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

    /**
     * 특정 Contact에 대해 시퀀스 실행 (비동기)
     */
    @Async
    public void executeSequence(Sequence sequence, Contact contact, InstagramAccount igAccount) {
        if (!sequence.isActive() || igAccount == null || contact.getIgUserId() == null) return;

        User user = sequence.getUser();
        List<SequenceStep> steps = sequence.getSteps().stream()
                .sorted(Comparator.comparingInt(SequenceStep::getStepOrder))
                .toList();

        log.info("시퀀스 시작: seqId={}, contact={}, steps={}", sequence.getId(), contact.getId(), steps.size());

        // activeSubscribers 증가
        sequence.setActiveSubscribers(
                (sequence.getActiveSubscribers() != null ? sequence.getActiveSubscribers() : 0) + 1);
        sequenceRepository.save(sequence);

        int completedSteps = 0;

        for (SequenceStep step : steps) {
            try {
                // 지연 대기
                if (step.getDelayMinutes() > 0) {
                    long delayMs = step.getDelayMinutes() * 60_000L;
                    log.debug("시퀀스 지연 대기: {}분 (stepOrder={})", step.getDelayMinutes(), step.getStepOrder());
                    Thread.sleep(delayMs);
                }

                switch (step.getType()) {
                    case MESSAGE -> executeMessageStep(step, contact, igAccount, user);
                    case CONDITION -> {
                        if (!evaluateCondition(step, contact)) {
                            log.debug("조건 미충족, 시퀀스 중단: stepOrder={}", step.getStepOrder());
                            return;
                        }
                    }
                    case TAG -> executeTagStep(step, contact);
                    case DELAY -> {
                        // DELAY type은 delayMinutes로 이미 처리됨
                    }
                    case NOTIFY -> log.info("알림 Step 실행: contact={}, step={}", contact.getId(), step.getName());
                }

                completedSteps++;

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("시퀀스 중단(인터럽트): seqId={}, contact={}", sequence.getId(), contact.getId());
                return;
            } catch (Exception e) {
                log.error("시퀀스 Step 실행 실패: stepOrder={}, error={}", step.getStepOrder(), e.getMessage());
            }
        }

        // 완료 처리
        if (completedSteps == steps.size()) {
            log.info("시퀀스 완료: seqId={}, contact={}", sequence.getId(), contact.getId());
        }

        // activeSubscribers 감소
        sequence.setActiveSubscribers(
                Math.max(0, (sequence.getActiveSubscribers() != null ? sequence.getActiveSubscribers() : 1) - 1));
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
