package com.instabot.backend.scheduler;

import com.instabot.backend.entity.Subscription;
import com.instabot.backend.repository.SubscriptionRepository;
import com.instabot.backend.service.BillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Portone+Danal 정기결제 스케줄러.
 *
 * 매일 오전 04:00 (서버 KST) — 당일까지 결제가 필요한 구독을 조회해 BillingService.renewNow 호출.
 * 실행 시간이 자정이 아닌 새벽 4시인 이유: Portone API 피크 회피 + 실패 시 당일 오전에 수동 대응 여지 확보.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionRenewalScheduler {

    private final SubscriptionRepository subscriptionRepository;
    private final BillingService billingService;

    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    public void runDailyRenewal() {
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> due = subscriptionRepository.findDueForRenewal(now);
        log.info("정기결제 대상: {}건", due.size());
        for (Subscription s : due) {
            try {
                billingService.renewNow(s.getId());
            } catch (Exception e) {
                log.error("정기결제 처리 실패: subId={}, err={}", s.getId(), e.getMessage(), e);
            }
        }
    }
}
