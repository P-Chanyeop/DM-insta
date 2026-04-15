package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 공동구매 캠페인 엔티티
 * - 재고 관리 (maxQuantity / currentCount)
 * - 상태 추적 (DRAFT → OPEN → SOLD_OUT → CLOSED → COMPLETED)
 * - 결제 링크 관리
 */
@Entity
@Table(name = "group_buys", indexes = {
        @Index(name = "idx_gb_user", columnList = "user_id"),
        @Index(name = "idx_gb_flow", columnList = "flow_id"),
        @Index(name = "idx_gb_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupBuy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flow_id")
    private Flow flow;

    @Column(nullable = false)
    private String title;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    /** 최대 수량 (0이면 무제한) */
    @Builder.Default
    private int maxQuantity = 0;

    /** 현재 판매 수량 */
    @Builder.Default
    private int currentCount = 0;

    /** 상품 가격 (표시용) */
    private String price;

    /** 셀러 결제 링크 (스마트스토어/토스 등) */
    private String paymentLink;

    /** 상품 이미지 URL */
    private String imageUrl;

    /** 옵션 목록 (JSON) - 예: [{"name":"블랙","price":"29000"},{"name":"화이트","price":"29000"}] */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String options;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private GroupBuyStatus status = GroupBuyStatus.DRAFT;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime openedAt;
    private LocalDateTime closedAt;

    public enum GroupBuyStatus {
        DRAFT,      // 초안
        OPEN,       // 판매 중
        SOLD_OUT,   // 매진
        CLOSED,     // 마감 (수동)
        COMPLETED   // 완료 (배송 등 끝)
    }

    /** 재고 확인: 무제한이거나 여유 있으면 true */
    public boolean hasStock() {
        return maxQuantity == 0 || currentCount < maxQuantity;
    }

    /** 남은 수량 (-1이면 무제한) */
    public int getRemainingStock() {
        return maxQuantity == 0 ? -1 : maxQuantity - currentCount;
    }
}
