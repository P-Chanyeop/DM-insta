package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

public class GrowthToolDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        private String type;
        private String name;
        private String refUrl;
        private String config;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String type;
        private String name;
        private String refUrl;
        private String config;
        private Long clickCount;
        private boolean active;
        private LocalDateTime createdAt;
    }
}
