package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 공동구매 참여자 엔티티
 * 풀사이클 상태 추적:
 *   APPLIED → OPTION_SELECTED → PAYMENT_SENT → PAID → SHIPPING → DELIVERED → REVIEWED
 */
@Entity
@Table(name = "group_buy_participants", indexes = {
        @Index(name = "idx_gbp_groupbuy", columnList = "group_buy_id"),
        @Index(name = "idx_gbp_contact", columnList = "contact_id"),
        @Index(name = "idx_gbp_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupBuyParticipant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_buy_id", nullable = false)
    private GroupBuy groupBuy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    /** 선택한 옵션명 */
    private String selectedOption;

    /** 선택한 수량 */
    @Builder.Default
    private int quantity = 1;

    /** 결제 금액 */
    private String amount;

    /** 운송장 번호 */
    private String trackingNumber;

    /** 메모 */
    private String memo;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ParticipantStatus status = ParticipantStatus.APPLIED;

    @Builder.Default
    private LocalDateTime appliedAt = LocalDateTime.now();

    private LocalDateTime paidAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;

    public enum ParticipantStatus {
        APPLIED,          // 신청
        OPTION_SELECTED,  // 옵션 선택 완료
        PAYMENT_SENT,     // 결제 링크 발송됨
        PAID,             // 결제 완료
        SHIPPING,         // 배송 중
        DELIVERED,        // 배송 완료
        REVIEWED,         // 리뷰 완료
        CANCELLED         // 취소
    }
}
