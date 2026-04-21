package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String type; // NEW_MESSAGE, AUTOMATION_ERROR, BILLING, SYSTEM, DAILY_REPORT, WEEKLY_REPORT

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String link; // 클릭 시 이동할 경로

    @Builder.Default
    @Column(name = "is_read")
    private boolean read = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
