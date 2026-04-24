package com.instabot.backend.dto;

import jakarta.validation.constraints.Email;
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
        private String email;
        private String phone;
        private Integer followerCount;
        private LocalDateTime subscribedAt;
        private LocalDateTime lastActiveAt;
        private LocalDateTime firstMessageAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        @Size(max = 20, message = "태그는 최대 20개까지 가능합니다")
        private Set<String> tags;
        private String memo;
        private String customFields;

        @Email(message = "올바른 이메일 형식이 아닙니다")
        @Size(max = 320, message = "이메일은 320자 이하로 입력하세요")
        private String email;

        @Size(max = 50, message = "전화번호는 50자 이하로 입력하세요")
        private String phone;
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
