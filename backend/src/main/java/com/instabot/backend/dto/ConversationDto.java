package com.instabot.backend.dto;

import com.instabot.backend.entity.Conversation;
import com.instabot.backend.entity.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

public class ConversationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private Conversation.ConversationStatus status;
        private String lastMessage;
        private boolean automationPaused;
        private String assignedTo;
        private LocalDateTime lastMessageAt;
        private LocalDateTime createdAt;

        // Contact info (flattened)
        private Long contactId;
        private String contactName;
        private String contactUsername;
        private String contactProfilePictureUrl;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MessageResponse {
        private Long id;
        private Message.Direction direction;
        private Message.MessageType type;
        private String content;
        private String mediaUrl;
        private boolean automated;
        private String automationName;
        private boolean read;
        private LocalDateTime sentAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SendMessageRequest {
        @NotBlank(message = "메시지 내용은 필수입니다")
        @Size(max = 1000, message = "메시지는 최대 1000자까지 가능합니다")
        private String content;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        private Conversation.ConversationStatus status;
        private String assignedTo;
        private Boolean automationPaused;
    }
}
