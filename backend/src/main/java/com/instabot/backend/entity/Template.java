package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Template {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;
    private String category; // SHOPPING, BOOKING, EVENT, LEAD, SUPPORT, CUSTOM

    @Lob
    @Column(columnDefinition = "TEXT")
    private String flowData; // JSON string of template nodes

    private String icon;
    private String gradientColors; // e.g. "#FF6B9D,#C44AFF"
    private String previewImageUrl; // 템플릿 미리보기 이미지 URL

    @Builder.Default
    private Long usageCount = 0L;

    @Builder.Default
    private Double rating = 0.0;

    @Builder.Default
    private boolean isPublic = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private User creator;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
