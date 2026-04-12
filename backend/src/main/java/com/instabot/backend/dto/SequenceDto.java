package com.instabot.backend.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class SequenceDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        private String name;
        private String description;
        private List<StepRequest> steps;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class StepRequest {
        private int stepOrder;
        private String name;
        private String messageContent;
        private int delayMinutes;
        private String type;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String description;
        private boolean active;
        private Long activeSubscribers;
        private Double completionRate;
        private List<StepResponse> steps;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StepResponse {
        private Long id;
        private int stepOrder;
        private String name;
        private String messageContent;
        private int delayMinutes;
        private String type;
        private Double openRate;
        private Double clickRate;
    }
}
