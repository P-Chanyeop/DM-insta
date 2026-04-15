package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.RecurringNotificationDto;
import com.instabot.backend.service.RecurringNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Recurring Notification API
 * - 토픽 관리 (목록/구독자)
 * - 알림 발송
 * - 구독 해제
 * - 쿼터 조회
 */
@RestController
@RequestMapping("/api/recurring")
@RequiredArgsConstructor
public class RecurringNotificationController {

    private final RecurringNotificationService recurringService;

    /** 토픽 목록 (구독자 수 포함) */
    @GetMapping("/topics")
    public ResponseEntity<List<RecurringNotificationDto.TopicSummary>> getTopics() {
        return ResponseEntity.ok(recurringService.getTopics(SecurityUtils.currentUserId()));
    }

    /** 특정 토픽의 구독자 목록 */
    @GetMapping("/topics/{topic}/subscribers")
    public ResponseEntity<List<RecurringNotificationDto.SubscriberResponse>> getSubscribers(
            @PathVariable String topic) {
        return ResponseEntity.ok(recurringService.getSubscribers(SecurityUtils.currentUserId(), topic));
    }

    /** 특정 토픽으로 알림 발송 */
    @PostMapping("/topics/{topic}/send")
    public ResponseEntity<RecurringNotificationDto.SendResult> sendNotification(
            @PathVariable String topic,
            @Valid @RequestBody RecurringNotificationDto.SendRequest request) {
        return ResponseEntity.ok(
                recurringService.sendNotification(SecurityUtils.currentUserId(), topic, request.getMessage()));
    }

    /** 구독 해제 */
    @DeleteMapping("/subscriptions/{id}")
    public ResponseEntity<Void> unsubscribe(@PathVariable Long id) {
        recurringService.unsubscribe(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    /** 쿼터 조회 */
    @GetMapping("/quota")
    public ResponseEntity<RecurringNotificationDto.QuotaInfo> getQuota() {
        return ResponseEntity.ok(recurringService.getQuota(SecurityUtils.currentUserId()));
    }
}
