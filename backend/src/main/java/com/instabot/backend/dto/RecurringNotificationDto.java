package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class RecurringNotificationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SendRequest {
        @NotBlank(message = "메시지는 필수입니다")
        private String message;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TopicSummary {
        private String topic;
        private String topicLabel;
        private long subscriberCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriberResponse {
        private Long id;
        private Long contactId;
        private String contactName;
        private String contactUsername;
        private String topic;
        private String topicLabel;
        private String frequency;
        private String status;
        private LocalDateTime subscribedAt;
        private LocalDateTime lastSentAt;
        private int sentCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SendResult {
        private int totalSubscribers;
        private int sentCount;
        private int failedCount;
        private List<String> errors;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class QuotaInfo {
        private long activeTopics;
        private long maxTopics;
        private long totalSubscribers;
    }
}
