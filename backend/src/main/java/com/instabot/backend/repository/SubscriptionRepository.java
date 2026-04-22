package com.instabot.backend.repository;

import com.instabot.backend.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByUserId(Long userId);

    Optional<Subscription> findByPortoneMerchantUid(String portoneMerchantUid);

    Optional<Subscription> findByPortoneCustomerUid(String portoneCustomerUid);

    /** 재결제 스케줄러용 — 결제 예정 시각이 지난 ACTIVE 구독. */
    @Query("SELECT s FROM Subscription s " +
            "WHERE s.status = com.instabot.backend.entity.Subscription.SubscriptionStatus.ACTIVE " +
            "AND s.cancelAtPeriodEnd = false " +
            "AND s.nextPaymentAt IS NOT NULL AND s.nextPaymentAt <= :now")
    List<Subscription> findDueForRenewal(LocalDateTime now);
}
