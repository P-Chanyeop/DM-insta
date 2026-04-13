package com.instabot.backend.service;

import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.ScheduledFollowUp;
import com.instabot.backend.entity.PendingFlowAction;
import com.instabot.backend.repository.PendingFlowActionRepository;
import com.instabot.backend.repository.ScheduledFollowUpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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

                instagramApiService.sendTextMessage(
                        botIgId, followUp.getRecipientIgId(), followUp.getMessage(), accessToken);

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
