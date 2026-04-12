package com.instabot.backend.dto;

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
        private Set<String> tags;
        private String memo;
        private String customFields;
    }
}
