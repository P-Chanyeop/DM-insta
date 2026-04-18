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
public class PaddleWebhookController {

    private final BillingService billingService;

    @PostMapping("/paddle")
    public ResponseEntity<String> handlePaddleWebhook(
            HttpServletRequest request,
            @RequestHeader("Paddle-Signature") String signature) throws IOException {
        String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        billingService.handleWebhook(payload, signature);
        return ResponseEntity.ok("ok");
    }
}
