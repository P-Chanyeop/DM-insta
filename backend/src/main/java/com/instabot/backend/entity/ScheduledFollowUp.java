package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 팔로업 메시지를 DB에 영구 저장하여 서버 재시작 시에도 유실되지 않도록 함.
 * FollowUpSchedulerService가 매분 폴링하여 발송 시간이 된 메시지를 처리.
 */
@Entity
@Table(name = "scheduled_follow_ups",
        indexes = {
                @Index(name = "idx_sfu_status_scheduled", columnList = "status, scheduledAt")
        })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledFollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ig_account_id", nullable = false)
    private InstagramAccount instagramAccount;

    /** DM을 받을 Instagram 사용자 ID */
    @Column(nullable = false)
    private String recipientIgId;

    /** 발송할 메시지 내용 */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    /** 예정 발송 시간 */
    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    private LocalDateTime sentAt;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING, SENT, FAILED
    }
}
