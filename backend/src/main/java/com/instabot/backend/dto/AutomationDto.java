package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

public class AutomationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "자동화 이름은 필수입니다")
        private String name;
        @NotBlank(message = "���동화 타���은 필수입니다")
        private String type;
        private String keyword;
        private String matchType;
        private String postId;
        private Long flowId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String type;
        private String keyword;
        private String matchType;
        private String postId;
        private Long flowId;
        private boolean active;
        private Long triggeredCount;
        private LocalDateTime createdAt;
    }
}
