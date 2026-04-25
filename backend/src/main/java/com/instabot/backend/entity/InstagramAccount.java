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

    /**
     * IG 자산이 연결된 Facebook Page 의 ID.
     * Facebook Login for Business OAuth 결과에서 받은 Page 의 id.
     * accessToken 컬럼에 저장된 토큰이 이 Page 의 Page Access Token 임을 의미.
     */
    private String fbPageId;

    private String username;

    @Column(length = 1024)
    private String accessToken;

    @Column(length = 2048)
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
