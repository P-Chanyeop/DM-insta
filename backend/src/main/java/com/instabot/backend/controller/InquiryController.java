package com.instabot.backend.controller;

import com.instabot.backend.service.EmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/public/inquiry")
@RequiredArgsConstructor
public class InquiryController {

    private final EmailService emailService;

    @Value("${app.inquiry.admin-email:oracle7579@gmail.com}")
    private String adminEmail;

    @PostMapping
    public ResponseEntity<?> submitInquiry(@Valid @RequestBody InquiryRequest request) {
        emailService.sendInquiryEmail(
                adminEmail,
                request.getName(),
                request.getEmail(),
                request.getCompany() != null ? request.getCompany() : "-",
                request.getPhone() != null ? request.getPhone() : "-",
                request.getMessage()
        );
        return ResponseEntity.ok(Map.of("success", true, "message", "문의가 접수되었습니다."));
    }

    @Data
    public static class InquiryRequest {
        @NotBlank(message = "이름을 입력해주세요")
        @Size(max = 50)
        private String name;

        @NotBlank(message = "이메일을 입력해주세요")
        @Email(message = "올바른 이메일 형식이 아닙니다")
        private String email;

        @Size(max = 100)
        private String company;

        @Size(max = 20)
        private String phone;

        @NotBlank(message = "문의 내용을 입력해주세요")
        @Size(max = 2000, message = "문의 내용은 2000자 이내로 입력해주세요")
        private String message;
    }
}
