package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "broadcasts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Broadcast {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String messageContent; // JSON of message blocks

    private String segment; // target segment filter

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BroadcastStatus status = BroadcastStatus.DRAFT;

    private Long sentCount;
    private Long openCount;
    private Long clickCount;
    private Double openRate;
    private Double clickRate;

    private LocalDateTime scheduledAt;
    private LocalDateTime sentAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum BroadcastStatus { DRAFT, SCHEDULED, SENDING, SENT, CANCELLED }
}
