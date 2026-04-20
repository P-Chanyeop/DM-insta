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

        private int unreadCount;

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
        @Size(max = 1000, message = "메시지는 최대 1000자까지 가능합니다")
        private String content;

        /** TEXT (기본), IMAGE, CARD */
        private Message.MessageType type;

        /** IMAGE: 이미지 URL */
        private String mediaUrl;

        /** CARD: 카드 제목 */
        private String cardTitle;
        /** CARD: 카드 부제목 */
        private String cardSubtitle;
        /** CARD: 버튼 텍스트 */
        private String cardButtonText;
        /** CARD: 버튼 URL */
        private String cardButtonUrl;

        public Message.MessageType getResolvedType() {
            return type != null ? type : Message.MessageType.TEXT;
        }
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        private Conversation.ConversationStatus status;
        private String assignedTo;
        private Boolean automationPaused;
    }
}
