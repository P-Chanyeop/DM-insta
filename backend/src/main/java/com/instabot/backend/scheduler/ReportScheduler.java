package com.instabot.backend.scheduler;

import com.instabot.backend.entity.NotificationSetting;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.MessageRepository;
import com.instabot.backend.repository.NotificationSettingRepository;
import com.instabot.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportScheduler {

    private final NotificationSettingRepository notificationSettingRepository;
    private final MessageRepository messageRepository;
    private final ContactRepository contactRepository;
    private final EmailService emailService;

    /**
     * 매일 오전 9시 일일 리포트
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyReports() {
        log.info("일일 리포트 발송 시작");
        List<NotificationSetting> settings = notificationSettingRepository.findByDailyReportTrue();

        LocalDateTime yesterday = LocalDateTime.now().minusDays(1).with(LocalTime.MIN);
        LocalDateTime todayStart = LocalDateTime.now().with(LocalTime.MIN);

        for (NotificationSetting setting : settings) {
            try {
                Long userId = setting.getUser().getId();
                String email = setting.getUser().getEmail();
                if (email == null) continue;

                long sentCount = messageRepository.countOutboundByUserIdAndSince(userId, yesterday);
                long newContacts = contactRepository.countByUserIdAndSubscribedAtAfter(userId, yesterday);

                long totalOutbound = messageRepository.countOutboundByUserIdAndSince(userId, yesterday);
                long readCount = messageRepository.countReadOutboundByUserIdAndSince(userId, yesterday);
                double openRate = totalOutbound > 0 ? (double) readCount / totalOutbound * 100.0 : 0.0;

                emailService.sendDailyReportEmail(email, sentCount, newContacts, openRate);
                log.debug("일일 리포트 발송: userId={}", userId);
            } catch (Exception e) {
                log.error("일일 리포트 발송 실패: userId={}, error={}", setting.getUser().getId(), e.getMessage());
            }
        }

        log.info("일일 리포트 발송 완료: {}명", settings.size());
    }

    /**
     * 매주 월요일 오전 9시 주간 리포트
     */
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendWeeklyReports() {
        log.info("주간 리포트 발송 시작");
        List<NotificationSetting> settings = notificationSettingRepository.findByWeeklyReportTrue();

        LocalDateTime weekAgo = LocalDateTime.now().minusWeeks(1).with(LocalTime.MIN);

        for (NotificationSetting setting : settings) {
            try {
                Long userId = setting.getUser().getId();
                String email = setting.getUser().getEmail();
                if (email == null) continue;

                long sentCount = messageRepository.countOutboundByUserIdAndSince(userId, weekAgo);
                long newContacts = contactRepository.countByUserIdAndSubscribedAtAfter(userId, weekAgo);

                long totalOutbound = messageRepository.countOutboundByUserIdAndSince(userId, weekAgo);
                long readCount = messageRepository.countReadOutboundByUserIdAndSince(userId, weekAgo);
                double openRate = totalOutbound > 0 ? (double) readCount / totalOutbound * 100.0 : 0.0;

                // 플로우 실행 횟수와 클릭률은 추후 별도 집계가 필요, 현재는 0으로
                long flowRuns = 0;
                double clickRate = 0.0;

                emailService.sendWeeklyReportEmail(email, sentCount, newContacts, flowRuns, openRate, clickRate);
                log.debug("주간 리포트 발송: userId={}", userId);
            } catch (Exception e) {
                log.error("주간 리포트 발송 실패: userId={}, error={}", setting.getUser().getId(), e.getMessage());
            }
        }

        log.info("주간 리포트 발송 완료: {}명", settings.size());
    }
}
