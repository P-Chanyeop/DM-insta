package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.NotificationDto;
import com.instabot.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 알림 목록 (최근 50개)
     */
    @GetMapping
    public ResponseEntity<List<NotificationDto.NotificationResponse>> getNotifications() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(notificationService.getNotifications(userId));
    }

    /**
     * 미읽은 알림 개수
     */
    @GetMapping("/unread")
    public ResponseEntity<NotificationDto.UnreadCountResponse> getUnreadCount() {
        Long userId = SecurityUtils.currentUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(NotificationDto.UnreadCountResponse.builder().count(count).build());
    }

    /**
     * 모두 읽음 처리
     */
    @PostMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllRead() {
        Long userId = SecurityUtils.currentUserId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok(Map.of("message", "모든 알림을 읽음 처리했습니다."));
    }

    /**
     * 알림 설정 조회
     */
    @GetMapping("/settings")
    public ResponseEntity<NotificationDto.SettingsResponse> getSettings() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(notificationService.getSettings(userId));
    }

    /**
     * 알림 설정 업데이트
     */
    @PutMapping("/settings")
    public ResponseEntity<NotificationDto.SettingsResponse> updateSettings(
            @RequestBody NotificationDto.UpdateSettingsRequest request) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(notificationService.updateSettings(userId, request));
    }
}
