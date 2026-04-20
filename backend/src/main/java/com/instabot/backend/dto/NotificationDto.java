package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

public class NotificationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class NotificationResponse {
        private Long id;
        private String type;
        private String title;
        private String message;
        private String link;
        private boolean read;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SettingsResponse {
        private boolean newMessage;
        private boolean automationError;
        private boolean dailyReport;
        private boolean weeklyReport;
        private boolean billingAlerts;
        private boolean systemUpdates;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateSettingsRequest {
        private Boolean newMessage;
        private Boolean automationError;
        private Boolean dailyReport;
        private Boolean weeklyReport;
        private Boolean billingAlerts;
        private Boolean systemUpdates;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UnreadCountResponse {
        private long count;
    }
}
