package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

public class PendingActionDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String senderIgId;
        private String pendingStep;
        private String flowName;
        private Long flowId;
        private String triggerKeyword;
        private String currentNodeId;
        private String igAccountUsername;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
        private LocalDateTime scheduledResumeAt;
        private boolean expired;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CleanupResult {
        private int cleanedCount;
    }
}
