package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "automations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Automation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flow_id")
    private Flow flow;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AutomationType type;

    private String keyword;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MatchType matchType = MatchType.CONTAINS;

    private String postId; // for comment triggers

    @Builder.Default
    private boolean active = true;

    private Long triggeredCount;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum AutomationType { DM_KEYWORD, COMMENT_TRIGGER, STORY_MENTION, STORY_REPLY, WELCOME_MESSAGE, ICEBREAKER }
    public enum MatchType { EXACT, CONTAINS }
}
