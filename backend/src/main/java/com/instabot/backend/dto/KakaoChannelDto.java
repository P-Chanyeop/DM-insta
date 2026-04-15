package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class KakaoChannelDto {

    @Getter @Setter
    public static class ConnectRequest {
        @NotBlank private String channelId;
        @NotBlank private String searchId;       // @카카오채널검색ID
        @NotBlank private String senderKey;       // 발신프로필 키
        @NotBlank private String apiKey;          // 카카오 비즈메시지 API 키
        private String channelName;
        private String profileImageUrl;
    }

    @Getter @Setter @Builder
    public static class ChannelResponse {
        private Long integrationId;
        private String channelId;
        private String searchId;
        private String channelName;
        private String profileImageUrl;
        private boolean active;
        private LocalDateTime connectedAt;
    }

    @Getter @Setter
    public static class AlimtalkRequest {
        @NotBlank private String templateCode;
        @NotBlank private String recipientPhone;
        private Map<String, String> variables;    // 템플릿 변수 치환
    }

    @Getter @Setter
    public static class FriendtalkRequest {
        @NotBlank private String recipientPhone;
        @NotBlank private String message;
        private String imageUrl;
        private List<Button> buttons;
    }

    @Getter @Setter
    public static class Button {
        private String type;   // WL(웹링크), AL(앱링크), BK(봇키워드), MD(메시지전달)
        private String name;
        private String urlMobile;
        private String urlPc;
    }

    @Getter @Setter @Builder
    public static class SendResult {
        private boolean success;
        private String messageId;
        private String errorCode;
        private String errorMessage;
    }

    @Getter @Setter @Builder
    public static class TemplateInfo {
        private String templateCode;
        private String templateName;
        private String templateContent;
        private String status;
        private List<Button> buttons;
    }
}
