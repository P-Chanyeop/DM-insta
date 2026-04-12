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
    private boolean read = false;

    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();

    public enum Direction { INBOUND, OUTBOUND }
    public enum MessageType { TEXT, IMAGE, CARD, BUTTON, QUICK_REPLY }
}
