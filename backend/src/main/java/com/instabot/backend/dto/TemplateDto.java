package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

public class TemplateDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String description;
        private String category;
        private String flowData;
        private String icon;
        private String gradientColors;
        private Long usageCount;
        private Double rating;
        private LocalDateTime createdAt;
    }
}
