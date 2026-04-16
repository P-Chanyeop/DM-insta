package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    // OAuth 가입 시 null 가능 (비밀번호 로그인 불가)
    @Column(nullable = true)
    private String password;

    private String name;

    /**
     * 인증 제공자
     * EMAIL : 이메일/비밀번호 가입
     * FACEBOOK : Facebook OAuth (Instagram 연동) 가입
     */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private AuthProvider authProvider = AuthProvider.EMAIL;

    // Facebook OAuth 가입 시 저장되는 Facebook 사용자 ID (unique)
    private String facebookUserId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PlanType plan = PlanType.FREE;

    // 업종 (온보딩 시 선택)
    private String industry;

    // 이메일 인증
    @Builder.Default
    private boolean emailVerified = false;

    private String verificationCode;
    private LocalDateTime verificationCodeExpiresAt;

    // 비밀번호 리셋
    private String resetCode;
    private LocalDateTime resetCodeExpiresAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum PlanType { FREE, PRO, ENTERPRISE }

    public enum AuthProvider { EMAIL, FACEBOOK }
}
