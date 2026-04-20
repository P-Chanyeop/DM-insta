package com.instabot.backend.service;

import com.instabot.backend.dto.NotificationDto;
import com.instabot.backend.entity.Notification;
import com.instabot.backend.entity.NotificationSetting;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.NotificationRepository;
import com.instabot.backend.repository.NotificationSettingRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationSettingRepository notificationSettingRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * 알림 발송 (인앱 + 이메일)
     * type별 동작:
     * - NEW_MESSAGE: 인앱 + 이메일
     * - AUTOMATION_ERROR: 인앱 + 이메일
     * - DAILY_REPORT: 이메일만 (인앱 저장 안 함)
     * - WEEKLY_REPORT: 이메일만 (인앱 저장 안 함)
     * - BILLING: 인앱 + 이메일
     * - SYSTEM: 인앱만
     */
    @Async
    public void notify(Long userId, String type, String title, String message, String link) {
        NotificationSetting settings = getOrCreateSettings(userId);

        // 설정에 따라 해당 알림이 비활성화되어 있으면 무시
        if (!isNotificationEnabled(settings, type)) {
            log.debug("알림 비활성화 상태: userId={}, type={}", userId, type);
            return;
        }

        // 인앱 알림 저장 (DAILY_REPORT, WEEKLY_REPORT는 이메일만)
        boolean saveInApp = !("DAILY_REPORT".equals(type) || "WEEKLY_REPORT".equals(type));
        if (saveInApp) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;

            Notification notification = Notification.builder()
                    .user(user)
                    .type(type)
                    .title(title)
                    .message(message)
                    .link(link)
                    .build();
            notificationRepository.save(notification);
        }

        // 이메일 발송 (SYSTEM은 인앱만)
        boolean sendEmail = !"SYSTEM".equals(type);
        if (sendEmail) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null && user.getEmail() != null) {
                String ctaUrl = link != null ? link : "/app/dashboard";
                emailService.sendNotificationEmail(user.getEmail(), title, title, message, "확인하기", ctaUrl);
            }
        }
    }

    /**
     * 알림 설정 조회 (없으면 기본값 생성)
     */
    @Transactional
    public NotificationSetting getOrCreateSettings(Long userId) {
        return notificationSettingRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId).orElse(null);
                    if (user == null) return NotificationSetting.builder().build();
                    NotificationSetting settings = NotificationSetting.builder()
                            .user(user)
                            .build();
                    return notificationSettingRepository.save(settings);
                });
    }

    /**
     * 알림 설정 조회 → DTO 변환
     */
    @Transactional
    public NotificationDto.SettingsResponse getSettings(Long userId) {
        NotificationSetting settings = getOrCreateSettings(userId);
        return NotificationDto.SettingsResponse.builder()
                .newMessage(settings.isNewMessage())
                .automationError(settings.isAutomationError())
                .dailyReport(settings.isDailyReport())
                .weeklyReport(settings.isWeeklyReport())
                .billingAlerts(settings.isBillingAlerts())
                .systemUpdates(settings.isSystemUpdates())
                .build();
    }

    /**
     * 알림 설정 업데이트
     */
    @Transactional
    public NotificationDto.SettingsResponse updateSettings(Long userId, NotificationDto.UpdateSettingsRequest request) {
        NotificationSetting settings = getOrCreateSettings(userId);

        if (request.getNewMessage() != null) settings.setNewMessage(request.getNewMessage());
        if (request.getAutomationError() != null) settings.setAutomationError(request.getAutomationError());
        if (request.getDailyReport() != null) settings.setDailyReport(request.getDailyReport());
        if (request.getWeeklyReport() != null) settings.setWeeklyReport(request.getWeeklyReport());
        if (request.getBillingAlerts() != null) settings.setBillingAlerts(request.getBillingAlerts());
        if (request.getSystemUpdates() != null) settings.setSystemUpdates(request.getSystemUpdates());

        notificationSettingRepository.save(settings);

        return NotificationDto.SettingsResponse.builder()
                .newMessage(settings.isNewMessage())
                .automationError(settings.isAutomationError())
                .dailyReport(settings.isDailyReport())
                .weeklyReport(settings.isWeeklyReport())
                .billingAlerts(settings.isBillingAlerts())
                .systemUpdates(settings.isSystemUpdates())
                .build();
    }

    /**
     * 알림 목록 (최근 50개)
     */
    public List<NotificationDto.NotificationResponse> getNotifications(Long userId) {
        return notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(n -> NotificationDto.NotificationResponse.builder()
                        .id(n.getId())
                        .type(n.getType())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .link(n.getLink())
                        .read(n.isRead())
                        .createdAt(n.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 모두 읽음 처리
     */
    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    /**
     * 미읽은 알림 개수
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    // ─── Private ───

    private boolean isNotificationEnabled(NotificationSetting settings, String type) {
        return switch (type) {
            case "NEW_MESSAGE" -> settings.isNewMessage();
            case "AUTOMATION_ERROR" -> settings.isAutomationError();
            case "DAILY_REPORT" -> settings.isDailyReport();
            case "WEEKLY_REPORT" -> settings.isWeeklyReport();
            case "BILLING" -> settings.isBillingAlerts();
            case "SYSTEM" -> settings.isSystemUpdates();
            default -> true;
        };
    }
}
