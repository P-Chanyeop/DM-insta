package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    private String mediaUrl;

    @Builder.Default
    private boolean automated = false;

    private String automationName;

    @Builder.Default
    @Column(name = "`read`")
    private boolean read = false;

    /** Instagram API에서 반환한 메시지 ID (읽음 확인 매칭용) */
    @Column(name = "ig_message_id")
    private String igMessageId;

    /** 읽음 확인 수신 시각 */
    private LocalDateTime readAt;

    /** 이 메시지를 발송한 Flow ID (openRate 계산용) */
    @Column(name = "flow_id")
    private Long flowId;

    /** 이 메시지를 발송한 Broadcast ID (openRate 계산용) */
    @Column(name = "broadcast_id")
    private Long broadcastId;

    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();

    public enum Direction { INBOUND, OUTBOUND }
    public enum MessageType { TEXT, IMAGE, CARD, BUTTON, QUICK_REPLY }
}
