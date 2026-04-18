package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 플로우 실행 중 사용자 응답을 기다리는 대기 상태 추적
 *
 * ManyChat 흐름:
 *  트리거 → 댓글답장 + 오프닝DM(버튼) → [버튼 클릭 대기]
 *    → 팔로우 확인 → [팔로우 대기] → 이메일 수집 → [이메일 대기]
 *    → 메인DM 발송 → 팔로업 스케줄링
 */
@Entity
@Table(name = "pending_flow_actions",
        indexes = {
                @Index(name = "idx_pfa_sender_step", columnList = "senderIgId, pendingStep"),
                @Index(name = "idx_pfa_expires", columnList = "expiresAt")
        })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingFlowAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flow_id", nullable = false)
    private Flow flow;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ig_account_id", nullable = false)
    private InstagramAccount instagramAccount;

    /** DM을 받는 Instagram 사용자 ID */
    @Column(nullable = false)
    private String senderIgId;

    /** 댓글 트리거인 경우 원본 댓글 ID */
    private String commentId;

    /** 트리거한 키워드 (메시지 변수 {키워드} 치환용) */
    private String triggerKeyword;

    /** v2 그래프: 실행이 중단된 노드 ID (resume 시 사용) */
    @Column(name = "current_node_id")
    private String currentNodeId;

    /** 현재 대기 중인 단계 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PendingStep pendingStep;

    /** Instagram 24시간 메시징 윈도우 만료 */
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.expiresAt == null) {
            this.expiresAt = LocalDateTime.now().plusHours(24);
        }
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /** v2 딜레이 노드: 스케줄된 재개 시각 */
    @Column(name = "scheduled_resume_at")
    private LocalDateTime scheduledResumeAt;

    public enum PendingStep {
        /** 오프닝 DM 버튼 클릭 대기 */
        AWAITING_POSTBACK,
        /** 팔로우 대기 */
        AWAITING_FOLLOW,
        /** 이메일 입력 대기 */
        AWAITING_EMAIL,
        /** 딜레이 노드 — 지정 시간 후 자동 재개 */
        AWAITING_DELAY,
        /** 완료 (메인DM 발송됨) */
        COMPLETED
    }
}
