package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "growth_tools")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GrowthTool {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private ToolType type;

    private String name;
    private String refUrl;
    private String config; // JSON config

    @Builder.Default
    private Long clickCount = 0L;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ToolType { REF_LINK, QR_CODE, WEBSITE_WIDGET, JSON_API }
}
