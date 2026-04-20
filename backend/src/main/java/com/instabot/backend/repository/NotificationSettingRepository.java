package com.instabot.backend.repository;

import com.instabot.backend.entity.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {
    Optional<NotificationSetting> findByUserId(Long userId);
    List<NotificationSetting> findByDailyReportTrue();
    List<NotificationSetting> findByWeeklyReportTrue();
}
