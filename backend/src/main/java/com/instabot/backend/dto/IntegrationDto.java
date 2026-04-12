package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

public class IntegrationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        private String type;
        private String name;
        private String config;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String type;
        private String name;
        private boolean active;
        private LocalDateTime createdAt;
        private LocalDateTime lastSyncAt;
    }
}
