package com.instabot.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.service.WebhookEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Instagram Webhook 수신 컨트롤러
 * - GET /api/webhook/instagram : Meta 검증 (challenge 응답)
 * - POST /api/webhook/instagram : 이벤트 수신 (messages, comments, postbacks 등)
 */
@Slf4j
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookEventService webhookEventService;

    @Value("${instagram.webhook.verify-token:instabot-webhook-verify-token}")
    private String verifyToken;

    /**
     * Webhook 검증 엔드포인트 (Meta가 등록 시 호출)
     */
    @GetMapping("/instagram")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Webhook 검증 성공");
            return ResponseEntity.ok(challenge);
        }

        log.warn("Webhook 검증 실패: mode={}, token={}", mode, token);
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Webhook 이벤트 수신 (messages, messaging_postbacks, comments)
     */
    @PostMapping("/instagram")
    public ResponseEntity<String> receiveEvent(@RequestBody JsonNode payload) {
        log.info("Webhook 이벤트 수신: {}", payload.get("object"));
        // [DEBUG] 진단용 raw payload 덤프 — DM 미수신 원인 추적. 진단 끝나면 제거.
        log.info("[WEBHOOK RAW] {}", payload.toString());

        try {
            webhookEventService.processWebhookEvent(payload);
        } catch (Exception e) {
            log.error("Webhook 이벤트 처리 실패: {}", e.getMessage(), e);
        }

        // Instagram은 항상 200을 기대 (아니면 재전송)
        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}
