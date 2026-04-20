package com.instabot.backend.controller;

import com.instabot.backend.service.EmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/public/support")
@RequiredArgsConstructor
public class SupportController {

    private final EmailService emailService;

    @Value("${app.inquiry.admin-email:oracle7579@gmail.com}")
    private String adminEmail;

    @PostMapping
    public ResponseEntity<?> submitSupport(@Valid @RequestBody SupportRequest request) {
        emailService.sendSupportEmail(
                adminEmail,
                request.getType(),
                request.getTitle(),
                request.getContent()
        );
        return ResponseEntity.ok(Map.of("success", true, "message", "문의가 접수되었습니다."));
    }

    @Data
    public static class SupportRequest {
        @NotBlank(message = "문의 유형을 선택해주세요")
        private String type;

        @NotBlank(message = "제목을 입력해주세요")
        @Size(max = 100, message = "제목은 100자 이내로 입력해주세요")
        private String title;

        @NotBlank(message = "내용을 입력해주세요")
        @Size(max = 3000, message = "내용은 3000자 이내로 입력해주세요")
        private String content;
    }
}
