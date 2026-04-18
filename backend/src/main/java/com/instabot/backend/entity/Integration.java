package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "integrations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Integration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private IntegrationType type;

    private String name;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String config; // JSON - encrypted API keys etc

    @Builder.Default
    private boolean active = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastSyncAt;

    public enum IntegrationType { INSTAGRAM, SHOPIFY, GOOGLE_SHEETS, PADDLE, KLAVIYO, WEBHOOK, OPENAI, KAKAO_CHANNEL }
}
