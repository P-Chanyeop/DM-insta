package com.instabot.backend.controller;

import com.instabot.backend.service.BillingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Portone(Iamport) 결제 Webhook 엔드포인트.
 * 대시보드 → 결제알림(Webhook) 관리에서 URL 등록: https://<domain>/api/webhook/portone
 *
 * Portone V1 의 웹훅은 서명 필드가 기본 제공되지 않아 imp_uid 를 다시 서버가 조회해 신뢰성을 확보한다.
 */
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class PortoneWebhookController {

    private final BillingService billingService;

    @PostMapping("/portone")
    public ResponseEntity<String> handlePortoneWebhook(HttpServletRequest request) throws IOException {
        String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        log.info("Portone webhook 수신: {}", payload);
        billingService.handleWebhook(payload);
        return ResponseEntity.ok("ok");
    }
}
