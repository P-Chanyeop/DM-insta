package com.instabot.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;

public class ContactDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String igUserId;
        private String username;
        private String name;
        private String profilePictureUrl;
        private int messageCount;
        private boolean active;
        private Set<String> tags;
        private String memo;
        private LocalDateTime subscribedAt;
        private LocalDateTime lastActiveAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        @Size(max = 20, message = "태그는 최대 20개까지 가능합니다")
        private Set<String> tags;
        private String memo;
        private String customFields;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ImportRequest {
        private String name;
        private String username;
        private String memo;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ImportResult {
        private int imported;
        private int skipped;
        private int total;
    }
}
