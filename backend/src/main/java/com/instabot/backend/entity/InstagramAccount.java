package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "instagram_accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InstagramAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String igUserId;

    private String username;

    @Column(length = 1024)
    private String accessToken;
    private String profilePictureUrl;
    private Long followersCount;
    private String accountType;

    @Builder.Default
    private boolean connected = true;

    @Builder.Default
    private boolean active = false;

    @Builder.Default
    private LocalDateTime connectedAt = LocalDateTime.now();

    private LocalDateTime tokenExpiresAt;
}
