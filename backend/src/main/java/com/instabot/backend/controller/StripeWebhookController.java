package com.instabot.backend.controller;

import com.instabot.backend.service.BillingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class StripeWebhookController {

    private final BillingService billingService;

    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            HttpServletRequest request,
            @RequestHeader("Stripe-Signature") String sigHeader) throws IOException {
        // Fix #5: raw bytes로 읽어 서명 검증 불일치 방지
        String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        billingService.handleWebhook(payload, sigHeader);
        return ResponseEntity.ok("ok");
    }
}
