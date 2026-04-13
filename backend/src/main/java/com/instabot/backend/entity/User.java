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

    @Column(nullable = false)
    private String password;

    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PlanType plan = PlanType.FREE;

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
}
