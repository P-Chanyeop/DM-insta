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
 * 토스페이먼츠 Webhook 엔드포인트.
 * 토스 대시보드 → 상점관리 → 웹훅 에서 URL 등록: https://<domain>/api/webhook/toss
 *
 * 토스는 Webhook 에 서명 필드를 기본 제공하지 않아 paymentKey 를 서버가 재조회해
 * 실제 상태를 확인하는 pull-verify 패턴을 사용한다.
 */
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class TossWebhookController {

    private final BillingService billingService;

    @PostMapping("/toss")
    public ResponseEntity<String> handleTossWebhook(HttpServletRequest request) throws IOException {
        String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        log.info("Toss webhook 수신: {}", payload);
        billingService.handleWebhook(payload);
        return ResponseEntity.ok("ok");
    }
}
