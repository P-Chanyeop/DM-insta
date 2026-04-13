package com.instabot.backend.controller;

import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthDto.AuthResponse> signup(@Valid @RequestBody AuthDto.SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthDto.AuthResponse> verifyEmail(@Valid @RequestBody AuthDto.VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<AuthDto.MessageResponse> resendVerification(@Valid @RequestBody AuthDto.ResendVerificationRequest request) {
        return ResponseEntity.ok(authService.resendVerification(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthDto.MessageResponse> forgotPassword(@Valid @RequestBody AuthDto.ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthDto.MessageResponse> resetPassword(@Valid @RequestBody AuthDto.ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }
}
