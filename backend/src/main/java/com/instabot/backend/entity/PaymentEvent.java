package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * 결제 이벤트 히스토리 — append-only audit log.
 *
 * subscriptions 테이블이 "현재 상태" 만 유지하므로 (toss_payment_key 등이 매달 덮어쓰기됨),
 * 이 테이블에 모든 결제 이벤트를 영구 보존해 다음 용도로 사용한다:
 *  - 유저 결제 내역 페이지
 *  - 분쟁/환불 대응 audit trail
 *  - 국세청 전자세금계산서 발행 금액 추적
 *  - 월별 매출 집계
 *
 * @see com.instabot.backend.service.BillingService#recordEvent 로만 생성.
 *      절대 UPDATE 하지 말 것.
 */
@Entity
@Table(name = "payment_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "subscription_id")
    private Long subscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private EventType eventType;

    @Column(name = "plan_type", length = 20)
    private String planType;

    /** 청구 금액(원). CHARGE_* 이벤트 외에는 null 가능. */
    private Long amount;

    /** 토스 응답 status — DONE / ABORTED / EXPIRED / CANCELED ... */
    @Column(length = 30)
    private String status;

    @Column(name = "toss_payment_key", length = 255)
    private String tossPaymentKey;

    @Column(name = "toss_order_id", length = 64)
    private String tossOrderId;

    /** 토스 에러 코드 (결제 실패 시). */
    @Column(name = "failure_code", length = 64)
    private String failureCode;

    /** 실패 사유 또는 해지 사유. */
    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    /** 토스 원본 응답 JSON — 디버깅/감사용. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_response", columnDefinition = "json")
    private String rawResponse;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum EventType {
        /** 결제 성공 (첫 결제 + 정기결제 모두 포함). */
        CHARGE_SUCCESS,
        /** 결제 실패 — PAST_DUE 전환. */
        CHARGE_FAILED,
        /** 플랜 변경 (향후 기능). */
        PLAN_CHANGE,
        /** 유저가 해지 예약. 다음 재결제 주기에 실제 해지됨. */
        CANCEL_SCHEDULED,
        /** 실제 해지 완료 — FREE 플랜으로 전환. */
        CANCELED,
        /** 환불 처리 (향후 기능). */
        REFUND,
        /** 토스 웹훅으로 ABORTED 수신. */
        WEBHOOK_ABORTED,
        /** 토스 웹훅으로 EXPIRED 수신. */
        WEBHOOK_EXPIRED
    }
}
