package com.instabot.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MessageResponse {
        private String message;
    }
}
