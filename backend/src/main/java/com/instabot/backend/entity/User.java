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

    // 장기 유효 Facebook User Access Token (암호화 저장)
    // IG 연결 실패 시 재시도 용도 + 페이지/IG Business Account 조회용
    @Column(length = 2048)
    private String facebookAccessToken;

    // Facebook 토큰 만료 시각 (장기 토큰 ≈ 60일)
    private LocalDateTime facebookTokenExpiresAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PlanType plan = PlanType.FREE;

    // 업종 (온보딩 시 선택)
    private String industry;

    // 온보딩 완료 여부 (모든 디바이스/브라우저에 영속)
    @Builder.Default
    private boolean onboardingCompleted = false;

    // 이메일 인증
    @Builder.Default
    private boolean emailVerified = false;

    private String verificationCode;
    private LocalDateTime verificationCodeExpiresAt;

    // 비밀번호 리셋
    private String resetCode;
    private LocalDateTime resetCodeExpiresAt;

    // ── 약관 동의 (전자상거래법/개인정보보호법 증빙) ──
    /** 이용약관 동의 시각. 가입 시 필수 → 항상 NOT NULL 이어야 함. */
    @Column(name = "terms_agreed_at")
    private LocalDateTime termsAgreedAt;

    /** 개인정보처리방침 동의 시각. 가입 시 필수. */
    @Column(name = "privacy_agreed_at")
    private LocalDateTime privacyAgreedAt;

    /** 마케팅 정보 수신 동의 시각. 선택 — 동의 거부 시 NULL, 나중에 토글 가능. */
    @Column(name = "marketing_agreed_at")
    private LocalDateTime marketingAgreedAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum PlanType { FREE, STARTER, PRO, BUSINESS }

    public enum AuthProvider { EMAIL, FACEBOOK, INSTAGRAM }
}
