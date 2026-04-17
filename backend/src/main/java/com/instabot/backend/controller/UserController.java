package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.UserDto;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ResponseEntity<UserDto.UserResponse> getMe() {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto.UserResponse> updateMe(@Valid @RequestBody UserDto.UpdateProfileRequest request) {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        user.setName(request.getName());
        if (request.getIndustry() != null) {
            user.setIndustry(request.getIndustry());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseEntity.ok(toResponse(user));
    }

    /**
     * 온보딩 완료 처리 (모든 디바이스에 영속).
     * 프론트의 localStorage 플래그는 캐시로만 사용하고, 백엔드 값이 정답.
     */
    @PatchMapping("/me/onboarding-complete")
    public ResponseEntity<UserDto.UserResponse> markOnboardingComplete() {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        if (!user.isOnboardingCompleted()) {
            user.setOnboardingCompleted(true);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }
        return ResponseEntity.ok(toResponse(user));
    }

    private UserDto.UserResponse toResponse(User user) {
        return UserDto.UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .plan(user.getPlan().name())
                .industry(user.getIndustry())
                .onboardingCompleted(user.isOnboardingCompleted())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody UserDto.ChangePasswordRequest request) {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("현재 비밀번호가 올바르지 않습니다.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다."));
    }

    /**
     * 회원 탈퇴 (S60) — 비밀번호 재확인 후 anonymize 방식으로 soft delete.
     * 완전 삭제 대신 개인정보만 제거하여 분석/통계 연속성 유지 (GDPR 권장).
     * Body: { "currentPassword": "..." }
     */
    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteMe(@RequestBody Map<String, String> body) {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        String password = body.get("currentPassword");
        if (password == null || password.isBlank()) {
            throw new BadRequestException("비밀번호를 입력해주세요.");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("비밀번호가 올바르지 않습니다.");
        }

        // Anonymize: 이메일/이름/비밀번호를 식별 불가 값으로 치환 + 토큰 무효화 상태
        long ts = System.currentTimeMillis();
        user.setEmail("deleted-" + user.getId() + "-" + ts + "@deleted.local");
        user.setName("삭제된 사용자");
        user.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        user.setFacebookAccessToken(null);
        user.setFacebookUserId(null);
        user.setFacebookTokenExpiresAt(null);
        user.setEmailVerified(false);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "계정이 삭제되었습니다."));
    }
}
