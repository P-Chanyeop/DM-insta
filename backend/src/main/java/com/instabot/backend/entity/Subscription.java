package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Subscription {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** Portone 빌링키 식별자 (cus_{userId}_{timestamp}) — 최초 결제 시 발급. */
    @Column(name = "portone_customer_uid")
    private String portoneCustomerUid;

    /** 최근 회차 주문 ID — 매 회차 새로 발급되지만 조회/멱등 목적으로 최신값 보관. */
    @Column(name = "portone_merchant_uid")
    private String portoneMerchantUid;

    /** 최근 성공한 imp_uid — 환불/조회용. */
    @Column(name = "portone_imp_uid")
    private String portoneImpUid;

    /** 플랜 (STARTER/PRO/BUSINESS). FREE 는 구독 row 생성 안 함. */
    @Column(name = "plan_type", length = 20)
    private String planType;

    /** 회차 청구 금액(원). */
    @Column(name = "amount")
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    private LocalDateTime currentPeriodStart;

    private LocalDateTime currentPeriodEnd;

    /** 다음 자동 결제 예정 시각. 스케줄러가 이 시각 이하인 구독을 재결제 대상으로 찾는다. */
    @Column(name = "next_payment_at")
    private LocalDateTime nextPaymentAt;

    @Builder.Default
    private boolean cancelAtPeriodEnd = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum SubscriptionStatus {
        ACTIVE, CANCELED, PAST_DUE, TRIALING, INCOMPLETE, PAUSED
    }
}
