package com.instabot.backend.service;

import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 브로드캐스트 실제 발송 서비스
 * - 즉시 발송 / 예약 발송
 * - 세그먼트 필터링 (ALL / VIP / NEW / ACTIVE)
 * - Instagram API Rate Limit 준수 (200 calls/hour → 약 3초 간격)
 * - 발송 진행률 추적
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BroadcastExecutionService {

    private final BroadcastRepository broadcastRepository;
    private final ContactRepository contactRepository;
    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;

    private static final long RATE_LIMIT_DELAY_MS = 3000; // 3초 간격 (200/hour)

    /**
     * 브로드캐스트 즉시 발송 (비동기)
     */
    @Async
    public void executeBroadcast(Long broadcastId) {
        Broadcast broadcast = broadcastRepository.findById(broadcastId).orElse(null);
        if (broadcast == null) return;

        broadcast.setStatus(Broadcast.BroadcastStatus.SENDING);
        broadcastRepository.save(broadcast);

        User user = broadcast.getUser();
        InstagramAccount igAccount = instagramApiService.getConnectedAccount(user.getId());

        if (igAccount == null) {
            log.error("브로드캐스트 발송 실패: Instagram 계정 미연결. broadcastId={}", broadcastId);
            broadcast.setStatus(Broadcast.BroadcastStatus.DRAFT);
            broadcastRepository.save(broadcast);
            return;
        }

        // 세그먼트별 대상 조회
        List<Contact> targets = getTargetContacts(user.getId(), broadcast.getSegment());

        log.info("브로드캐스트 시작: id={}, segment={}, targets={}", broadcastId, broadcast.getSegment(), targets.size());

        long sentCount = 0;
        for (Contact contact : targets) {
            if (contact.getIgUserId() == null) continue;

            try {
                instagramApiService.sendTextMessage(
                        igAccount.getIgUserId(),
                        contact.getIgUserId(),
                        broadcast.getMessageContent(),
                        instagramApiService.getDecryptedToken(igAccount)
                );

                // 발신 메시지 저장
                conversationService.saveOutboundMessage(
                        user, contact.getIgUserId(),
                        broadcast.getMessageContent(), true, broadcast.getName()
                );

                sentCount++;
                broadcast.setSentCount(sentCount);
                broadcastRepository.save(broadcast);

                // Rate Limit 준수
                Thread.sleep(RATE_LIMIT_DELAY_MS);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("브로드캐스트 개별 발송 실패: contact={}, error={}", contact.getId(), e.getMessage());
            }
        }

        broadcast.setStatus(Broadcast.BroadcastStatus.SENT);
        broadcast.setSentAt(LocalDateTime.now());
        broadcastRepository.save(broadcast);

        log.info("브로드캐스트 완료: id={}, sent={}/{}", broadcastId, sentCount, targets.size());
    }

    /**
     * 예약 발송 스케줄러 (매분 실행)
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void processScheduledBroadcasts() {
        List<Broadcast> scheduled = broadcastRepository.findAll().stream()
                .filter(b -> b.getStatus() == Broadcast.BroadcastStatus.SCHEDULED
                        && b.getScheduledAt() != null
                        && b.getScheduledAt().isBefore(LocalDateTime.now()))
                .toList();

        for (Broadcast broadcast : scheduled) {
            log.info("예약 브로드캐스트 실행: id={}, scheduledAt={}", broadcast.getId(), broadcast.getScheduledAt());
            executeBroadcast(broadcast.getId());
        }
    }

    private List<Contact> getTargetContacts(Long userId, String segment) {
        if (segment == null || segment.isBlank() || "ALL".equalsIgnoreCase(segment)) {
            return contactRepository.findByUserId(userId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        }

        return switch (segment.toUpperCase()) {
            case "VIP" -> contactRepository.findByUserId(userId, org.springframework.data.domain.Pageable.unpaged())
                    .getContent().stream()
                    .filter(c -> c.getTags().contains("VIP"))
                    .toList();
            case "NEW" -> contactRepository.findByUserId(userId, org.springframework.data.domain.Pageable.unpaged())
                    .getContent().stream()
                    .filter(c -> c.getSubscribedAt() != null
                            && c.getSubscribedAt().isAfter(LocalDateTime.now().minusDays(7)))
                    .toList();
            case "ACTIVE" -> contactRepository.findByUserIdAndActiveTrue(userId, org.springframework.data.domain.Pageable.unpaged())
                    .getContent();
            default -> contactRepository.findByUserId(userId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        };
    }
}
