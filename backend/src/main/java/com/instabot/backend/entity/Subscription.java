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

    /**
     * 토스페이먼츠 customerKey — 빌링키 발급 시 사용한 고객 식별자.
     * 프론트 SDK 초기화에 사용되며, 재결제 시에도 billingKey + customerKey 매칭 검증.
     * 형식: "cust_{userId}_{uuid}"
     */
    @Column(name = "toss_customer_key", length = 64)
    private String tossCustomerKey;

    /**
     * 토스페이먼츠 billingKey — 정기결제용 영구 카드 토큰.
     * authKey 교환으로 발급받으며, 이 값으로 매월 /v1/billing/{billingKey} 호출.
     */
    @Column(name = "toss_billing_key", length = 255)
    private String tossBillingKey;

    /** 최근 회차 주문 ID — 매 회차 새로 발급. 멱등성 체크 및 조회용. */
    @Column(name = "toss_order_id", length = 64)
    private String tossOrderId;

    /** 최근 성공한 paymentKey — 환불/결제 단건 조회용. */
    @Column(name = "toss_payment_key", length = 255)
    private String tossPaymentKey;

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
