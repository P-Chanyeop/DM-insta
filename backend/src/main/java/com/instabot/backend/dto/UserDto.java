package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

public class UserDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserResponse {
        private Long id;
        private String email;
        private String name;
        private String plan;
        private String createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateProfileRequest {
        @NotBlank(message = "이름을 입력해 주세요.")
        private String name;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ChangePasswordRequest {
        @NotBlank(message = "현재 비밀번호를 입력해 주세요.")
        private String currentPassword;

        @NotBlank(message = "새 비밀번호를 입력해 주세요.")
        @Size(min = 6, message = "비밀번호는 최소 6자 이상이어야 합니다.")
        private String newPassword;
    }
}
