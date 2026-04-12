package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

public class BroadcastDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "브로���캐스트 이름��� 필수입니다")
        private String name;
        @NotBlank(message = "메시지 내용은 필수입니다")
        private String messageContent;
        private String segment;
        private LocalDateTime scheduledAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String status;
        private String segment;
        private Long sentCount;
        private Long openCount;
        private Long clickCount;
        private Double openRate;
        private Double clickRate;
        private LocalDateTime scheduledAt;
        private LocalDateTime sentAt;
        private LocalDateTime createdAt;
    }
}
