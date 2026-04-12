package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

public class FlowDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "플로우 이름은 필수입니다")
        private String name;
        @NotBlank(message = "트리거 타입은 필수입니다")
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
