package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.RecurringNotificationDto;
import com.instabot.backend.entity.*;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Recurring Notification 서비스
 * Instagram 24시간 메시징 윈도우 외에도 옵트인 사용자에게 마케팅 메시지 발송
 *
 * Meta 제한:
 * - 7일간 최대 10개 토픽
 * - 일일 최대 5개 토픽
 * - 사용자 명시적 옵트인 필수
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringNotificationService {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final RecurringSubscriptionRepository subscriptionRepository;
    private final ContactRepository contactRepository;

    private static final long MAX_TOPICS = 10;

    // ═══════════════════════════════════════════════════════════
    // 옵트인 요청
    // ═══════════════════════════════════════════════════════════

    /**
     * 사용자에게 옵트인 요청 DM 발송
     * FlowExecutionService의 OptInNode에서 호출
     */
    public void requestOptIn(InstagramAccount igAccount, String recipientIgId,
                              String message, String topic, String topicLabel, String frequency) {
        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();

        try {
            JsonNode response = instagramApiService.requestRecurringOptIn(
                    botIgId, recipientIgId, message, topic, frequency, accessToken);

            log.info("Recurring opt-in 요청 발송: topic={}, recipient={}", topic, recipientIgId);

            // 대화 기록 저장
            conversationService.saveOutboundMessage(
                    igAccount.getUser(), recipientIgId,
                    "[알림 구독 요청] " + topicLabel + ": " + message,
                    true, "Recurring Notification");

        } catch (Exception e) {
            log.error("Recurring opt-in 요청 실패: topic={}, error={}", topic, e.getMessage());
        }
    }

    /**
     * 옵트인 승인 처리 (Webhook에서 notification_messages_token 수신 시 호출)
     */
    @Transactional
    public void handleOptInAccepted(Long userId, String recipientIgId,
                                     String topic, String notificationToken,
                                     LocalDateTime tokenExpiry) {
        // Contact 조회
        Contact contact = contactRepository.findByUserIdAndIgUserId(userId, recipientIgId)
                .orElse(null);
        if (contact == null) {
            log.warn("옵트인 승인 처리 실패: contact 없음 (userId={}, igId={})", userId, recipientIgId);
            return;
        }

        // 기존 구독 확인
        var existing = subscriptionRepository.findByUserIdAndContactIdAndTopic(userId, contact.getId(), topic);
        if (existing.isPresent()) {
            // 재구독: 토큰 갱신
            RecurringSubscription sub = existing.get();
            sub.setNotificationToken(notificationToken);
            sub.setTokenExpiresAt(tokenExpiry);
            sub.setStatus(RecurringSubscription.SubscriptionStatus.ACTIVE);
            sub.setUnsubscribedAt(null);
            subscriptionRepository.save(sub);
            log.info("Recurring 재구독: contactId={}, topic={}", contact.getId(), topic);
        } else {
            // 새 구독
            RecurringSubscription sub = RecurringSubscription.builder()
                    .user(contact.getUser())
                    .contact(contact)
                    .topic(topic)
                    .topicLabel(topic) // 기본값, 나중에 업데이트 가능
                    .notificationToken(notificationToken)
                    .tokenExpiresAt(tokenExpiry)
                    .build();
            subscriptionRepository.save(sub);
            log.info("Recurring 신규 구독: contactId={}, topic={}", contact.getId(), topic);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 알림 발송
    // ═══════════════════════════════════════════════════════════

    /**
     * 특정 토픽의 모든 구독자에게 메시지 발송
     */
    @Transactional
    public RecurringNotificationDto.SendResult sendNotification(Long userId, String topic, String message) {
        InstagramAccount igAccount = instagramApiService.getConnectedAccount(userId);
        if (igAccount == null) {
            throw new BadRequestException("연결된 Instagram 계정이 없습니다.");
        }

        List<RecurringSubscription> subscribers = subscriptionRepository
                .findByUserIdAndTopicAndStatus(userId, topic, RecurringSubscription.SubscriptionStatus.ACTIVE);

        if (subscribers.isEmpty()) {
            throw new BadRequestException("해당 토픽의 구독자가 없습니다.");
        }

        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String botIgId = igAccount.getIgUserId();

        int sentCount = 0;
        int failedCount = 0;
        List<String> errors = new ArrayList<>();

        for (RecurringSubscription sub : subscribers) {
            if (!sub.isTokenValid()) {
                sub.setStatus(RecurringSubscription.SubscriptionStatus.EXPIRED);
                subscriptionRepository.save(sub);
                failedCount++;
                continue;
            }

            try {
                instagramApiService.sendRecurringNotification(
                        botIgId, sub.getContact().getIgUserId(),
                        message, sub.getNotificationToken(), accessToken);

                sub.setLastSentAt(LocalDateTime.now());
                sub.setSentCount(sub.getSentCount() + 1);
                subscriptionRepository.save(sub);
                sentCount++;
            } catch (Exception e) {
                failedCount++;
                errors.add(sub.getContact().getUsername() + ": " + e.getMessage());
                log.error("Recurring 발송 실패: contactId={}, error={}", sub.getContact().getId(), e.getMessage());
            }
        }

        // 대화 기록 저장 (요약)
        conversationService.saveOutboundMessage(
                igAccount.getUser(), "BROADCAST",
                String.format("[Recurring] %s — %d명 발송 (%d 실패)", topic, sentCount, failedCount),
                true, "Recurring Notification");

        log.info("Recurring notification 발송 완료: topic={}, sent={}, failed={}", topic, sentCount, failedCount);

        return RecurringNotificationDto.SendResult.builder()
                .totalSubscribers(subscribers.size())
                .sentCount(sentCount)
                .failedCount(failedCount)
                .errors(errors)
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    // 구독 관리
    // ═══════════════════════════════════════════════════════════

    public List<RecurringNotificationDto.TopicSummary> getTopics(Long userId) {
        List<Object[]> raw = subscriptionRepository.getTopicSummary(userId);
        return raw.stream().map(row -> RecurringNotificationDto.TopicSummary.builder()
                .topic((String) row[0])
                .topicLabel((String) row[1])
                .subscriberCount((Long) row[2])
                .build()
        ).toList();
    }

    public List<RecurringNotificationDto.SubscriberResponse> getSubscribers(Long userId, String topic) {
        List<RecurringSubscription> subs = subscriptionRepository
                .findByUserIdAndTopicAndStatus(userId, topic, RecurringSubscription.SubscriptionStatus.ACTIVE);

        return subs.stream().map(s -> RecurringNotificationDto.SubscriberResponse.builder()
                .id(s.getId())
                .contactId(s.getContact().getId())
                .contactName(s.getContact().getName())
                .contactUsername(s.getContact().getUsername())
                .topic(s.getTopic())
                .topicLabel(s.getTopicLabel())
                .frequency(s.getFrequency().name())
                .status(s.getStatus().name())
                .subscribedAt(s.getSubscribedAt())
                .lastSentAt(s.getLastSentAt())
                .sentCount(s.getSentCount())
                .build()
        ).toList();
    }

    @Transactional
    public void unsubscribe(Long userId, Long subscriptionId) {
        RecurringSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("구독을 찾을 수 없습니다."));
        if (!sub.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("구독을 찾을 수 없습니다.");
        }
        sub.setStatus(RecurringSubscription.SubscriptionStatus.UNSUBSCRIBED);
        sub.setUnsubscribedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);
    }

    public RecurringNotificationDto.QuotaInfo getQuota(Long userId) {
        long activeTopics = subscriptionRepository.countActiveTopics(userId);
        long totalSubscribers = subscriptionRepository.findByUserIdAndStatus(
                userId, RecurringSubscription.SubscriptionStatus.ACTIVE).size();

        return RecurringNotificationDto.QuotaInfo.builder()
                .activeTopics(activeTopics)
                .maxTopics(MAX_TOPICS)
                .totalSubscribers(totalSubscribers)
                .build();
    }
}
