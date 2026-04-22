package com.instabot.backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

public class AuthDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SignupRequest {
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 6)
        private String password;
        @NotBlank
        private String name;

        // ── 약관 동의 ──
        @AssertTrue(message = "이용약관에 동의해야 가입할 수 있습니다.")
        private boolean termsAgreed;
        @AssertTrue(message = "개인정보처리방침에 동의해야 가입할 수 있습니다.")
        private boolean privacyAgreed;
        /** 마케팅 수신은 선택 — 기본 false. */
        private boolean marketingAgreed;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class VerifyEmailRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String code;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ResendVerificationRequest {
        @NotBlank @Email
        private String email;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ForgotPasswordRequest {
        @NotBlank @Email
        private String email;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String code;
        @NotBlank @Size(min = 6)
        private String newPassword;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AuthResponse {
        private String token;
        private String email;
        private String name;
        private String plan;
        private boolean emailVerified;
        private boolean onboardingCompleted;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MessageResponse {
        private String message;
    }

    /**
     * Instagram OAuth 후 이메일 입력 스텝에서 사용.
     * OAuth 콜백이 발급한 pending-signup 토큰을 이메일/비밀번호/이름과 함께 서버로 전송해 실제 가입을 완료한다.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CompleteIgSignupRequest {
        @NotBlank
        private String pendingToken;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 6)
        private String password;
        @NotBlank
        private String name;

        // ── 약관 동의 ──
        @AssertTrue(message = "이용약관에 동의해야 가입할 수 있습니다.")
        private boolean termsAgreed;
        @AssertTrue(message = "개인정보처리방침에 동의해야 가입할 수 있습니다.")
        private boolean privacyAgreed;
        private boolean marketingAgreed;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class MarketingConsentRequest {
        @NotNull
        private Boolean agreed;
    }
}
