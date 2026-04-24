package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flows")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Flow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String flowData; // JSON string of nodes/edges

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FlowStatus status = FlowStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TriggerType triggerType = TriggerType.KEYWORD;

    @Builder.Default
    private boolean active = false;

    /**
     * 같은 triggerType 내 실행 우선순위. 낮을수록 먼저 매칭 (ASC).
     * shadowing(더 구체적인 플로우가 일반 플로우에 가려짐) 을 유저가 수동 해결하도록 노출.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    private Long sentCount;
    private Double openRate;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum FlowStatus { DRAFT, PUBLISHED, ARCHIVED }
    public enum TriggerType { KEYWORD, COMMENT, STORY_MENTION, STORY_REPLY, WELCOME, ICEBREAKER }
}
