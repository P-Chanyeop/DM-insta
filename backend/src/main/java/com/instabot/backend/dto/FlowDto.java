package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

public class FlowDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        private String name;
        private String triggerType;
        private String flowData;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private String flowData;
        private Boolean active;
        private String status;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String triggerType;
        private String status;
        private boolean active;
        private String flowData;
        private Long sentCount;
        private Double openRate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
