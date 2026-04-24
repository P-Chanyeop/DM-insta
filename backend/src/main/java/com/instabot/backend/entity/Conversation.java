package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ConversationStatus status = ConversationStatus.OPEN;

    private String lastMessage;

    @Builder.Default
    private boolean automationPaused = false;

    /** 자동화 재개 시각 — 수동 메시지 발송 시 now+24h 로 설정.
     *  null 이면 무기한 일시정지 (사용자가 명시적으로 토글). */
    @Column(name = "automation_pause_end")
    private LocalDateTime automationPauseEnd;

    private String assignedTo;

    @Builder.Default
    private LocalDateTime lastMessageAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ConversationStatus { OPEN, CLOSED, SNOOZED }
}
