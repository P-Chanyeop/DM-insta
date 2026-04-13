package com.instabot.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

public class TeamDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class InviteMemberRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String role;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRoleRequest {
        @NotBlank
        private String role;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TeamMemberResponse {
        private Long id;
        private Long userId;
        private String email;
        private String name;
        private String role;
        private LocalDateTime joinedAt;
    }
}
