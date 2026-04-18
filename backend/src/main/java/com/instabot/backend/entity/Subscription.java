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

    /** Paddle 고객 ID (ctm_...) */
    @Column(name = "paddle_customer_id")
    private String paddleCustomerId;

    /** Paddle 구독 ID (sub_...) */
    @Column(name = "paddle_subscription_id")
    private String paddleSubscriptionId;

    /** Paddle 가격 ID (pri_...) */
    @Column(name = "paddle_price_id")
    private String paddlePriceId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    private LocalDateTime currentPeriodStart;

    private LocalDateTime currentPeriodEnd;

    @Builder.Default
    private boolean cancelAtPeriodEnd = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum SubscriptionStatus {
        ACTIVE, CANCELED, PAST_DUE, TRIALING, INCOMPLETE, PAUSED
    }
}
