package com.softcat.instagramscraper.user.entity;

import com.softcat.instagramscraper.common.entity.BaseEntity;
import com.softcat.instagramscraper.common.util.SubscriptionPlan;
import com.softcat.instagramscraper.common.util.UserRole;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

/**
 * 사용자 엔티티 (Rich Domain Model)
 * - 기본 사용자 정보 관리
 * - 구독 플랜 및 역할 관리
 * - JWT 토큰 관련 기능
 * - 비즈니스 로직 포함 (객체지향적 접근)
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {
    
    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;
    
    @Column(name = "password", nullable = false, length = 255)
    private String password;
    
    @Column(name = "name", nullable = false, length = 50)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", nullable = false)
    private SubscriptionPlan subscriptionPlan;
    
    @Column(name = "search_count", nullable = false)
    private Integer searchCount = 0;
    
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    // JWT Refresh Token 관리
    @Column(name = "refresh_token", length = 500)
    private String refreshToken;
    
    @Column(name = "refresh_token_expires_at")
    private LocalDateTime refreshTokenExpiresAt;
    
    /**
     * 사용자 생성 (Builder 패턴)
     */
    @Builder
    public User(String email, String password, String name, UserRole role, SubscriptionPlan subscriptionPlan) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role != null ? role : UserRole.USER;
        this.subscriptionPlan = subscriptionPlan != null ? subscriptionPlan : SubscriptionPlan.FREE;
        this.searchCount = 0;
        this.isActive = true;
    }
    
    /**
     * 비밀번호 암호화 (Rich Domain Model)
     */
    public void encodePassword(PasswordEncoder passwordEncoder) {
        this.password = passwordEncoder.encode(this.password);
    }
    
    /**
     * 비밀번호 검증
     */
    public boolean isPasswordMatch(String rawPassword, PasswordEncoder passwordEncoder) {
        if (rawPassword == null || rawPassword.isEmpty()) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, this.password);
    }
    
    /**
     * 로그인 시간 업데이트
     */
    public void updateLastLoginAt() {
        this.lastLoginAt = LocalDateTime.now();
    }
    
    /**
     * 검색 횟수 증가
     */
    public void incrementSearchCount() {
        this.searchCount++;
    }
    
    /**
     * 검색 가능 여부 확인 (구독 플랜별 제한)
     */
    public boolean canSearch(int planSearchLimit) {
        if (planSearchLimit == -1) { // 무제한
            return true;
        }
        return this.searchCount < planSearchLimit;
    }
    
    /**
     * 구독 플랜 업그레이드
     */
    public void upgradeSubscriptionPlan(SubscriptionPlan newPlan) {
        this.subscriptionPlan = newPlan;
        // 플랜 변경 시 검색 횟수 초기화 (비즈니스 로직)
        this.searchCount = 0;
    }
    
    /**
     * 계정 활성화/비활성화
     */
    public void activate() {
        this.isActive = true;
    }
    
    public void deactivate() {
        this.isActive = false;
    }
    
    /**
     * Refresh Token 설정
     */
    public void updateRefreshToken(String refreshToken, LocalDateTime expiresAt) {
        this.refreshToken = refreshToken;
        this.refreshTokenExpiresAt = expiresAt;
    }
    
    /**
     * Refresh Token 만료 확인
     */
    public boolean isRefreshTokenExpired() {
        return refreshTokenExpiresAt == null || refreshTokenExpiresAt.isBefore(LocalDateTime.now());
    }
    
    /**
     * Refresh Token 삭제 (로그아웃)
     */
    public void clearRefreshToken() {
        this.refreshToken = null;
        this.refreshTokenExpiresAt = null;
    }
    
    /**
     * 관리자 권한 확인
     */
    public boolean isAdmin() {
        return this.role == UserRole.ADMIN;
    }
}
