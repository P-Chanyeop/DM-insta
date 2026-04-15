package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Recurring Notification 구독 엔티티
 * Instagram 24시간 메시징 윈도우를 넘어 마케팅 메시지를 보낼 수 있는 옵트인 구독
 *
 * Meta 제한:
 * - 7일간 최대 10개 토픽
 * - 일일 최대 5개 토픽
 * - 사용자 명시적 옵트인 필수
 */
@Entity
@Table(name = "recurring_subscriptions", indexes = {
        @Index(name = "idx_rs_user_topic", columnList = "user_id, topic"),
        @Index(name = "idx_rs_contact_topic", columnList = "contact_id, topic"),
        @Index(name = "idx_rs_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_rs_contact_topic", columnNames = {"contact_id", "topic", "user_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecurringSubscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 셀러 (구독을 관리하는 사업자) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 구독한 연락처 (팔로워) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    /** 토픽 식별자 (예: new_products, sale, groupbuy) */
    @Column(nullable = false, length = 100)
    private String topic;

    /** 토픽 표시명 (예: "신상품 소식", "할인 알림") */
    private String topicLabel;

    /** Meta에서 발급한 notification token (24h 외 발송 시 사용) */
    @Column(length = 512)
    private String notificationToken;

    /** 토큰 만료일 */
    private LocalDateTime tokenExpiresAt;

    /** 발송 빈도 */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Frequency frequency = Frequency.WEEKLY;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Builder.Default
    private LocalDateTime subscribedAt = LocalDateTime.now();

    private LocalDateTime unsubscribedAt;

    /** 마지막 발송 시각 */
    private LocalDateTime lastSentAt;

    /** 총 발송 횟수 */
    @Builder.Default
    private int sentCount = 0;

    public enum Frequency {
        DAILY, WEEKLY, MONTHLY
    }

    public enum SubscriptionStatus {
        ACTIVE,       // 구독 중
        UNSUBSCRIBED, // 구독 해제
        EXPIRED       // 토큰 만료
    }

    /** 토큰이 유효한지 확인 */
    public boolean isTokenValid() {
        return notificationToken != null
                && tokenExpiresAt != null
                && tokenExpiresAt.isAfter(LocalDateTime.now())
                && status == SubscriptionStatus.ACTIVE;
    }
}
