package com.instabot.backend.dto;

import com.instabot.backend.entity.Conversation;
import com.instabot.backend.entity.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class ConversationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private Conversation.ConversationStatus status;
        private String lastMessage;
        private boolean automationPaused;
        private LocalDateTime automationPauseEnd;
        private String assignedTo;
        private LocalDateTime lastMessageAt;
        /** 상대방(고객)이 마지막으로 DM 보낸 시각 — 정보 패널 "마지막 활동" 표시 + 창 판정 기준 */
        private LocalDateTime lastInboundAt;
        private LocalDateTime createdAt;

        private int unreadCount;

        // Meta Messaging Policy 창 상태 (STANDARD / HUMAN_AGENT / OUTSIDE)
        private String messagingWindow;
        /** 자동화 가능 만료 시각 (= lastInboundAt + 24h). 프론트 카운트다운용. */
        private LocalDateTime messagingWindowStandardExpiresAt;
        /** 수동 발송 가능 만료 시각 (= lastInboundAt + 7일). */
        private LocalDateTime messagingWindowHumanAgentExpiresAt;
        /** 편의 플래그 — 프론트에서 버튼 활성화 판단 시 사용 */
        private boolean canAutomatedSend;
        private boolean canManualSend;

        // Contact info (flattened)
        private Long contactId;
        private String contactName;
        private String contactUsername;
        private String contactProfilePictureUrl;
        private List<String> tags;
        private String memo;
        /** 이 연락처로부터 첫 DM 을 수신한 시점 (= 고객 유입일) */
        private LocalDateTime firstMessageAt;
        /** Instagram 팔로워 수 — Graph API insights 권한 필요. 없으면 null */
        private Integer followerCount;
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
        private LocalDateTime readAt;
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
