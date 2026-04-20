package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "contacts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Contact {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String igUserId;
    private String username;
    private String name;
    @Column(length = 2048) // IG CDN URL이 signed params 포함해 매우 긴 경우가 있어 충분히 확보
    private String profilePictureUrl;

    @Builder.Default
    private int messageCount = 0;

    @Builder.Default
    private boolean active = true;

    @ElementCollection
    @CollectionTable(name = "contact_tags", joinColumns = @JoinColumn(name = "contact_id"))
    @Column(name = "tag")
    @Builder.Default
    private Set<String> tags = new HashSet<>();

    @Lob
    @Column(columnDefinition = "TEXT")
    private String customFields; // JSON

    private String memo;

    @Builder.Default
    private LocalDateTime subscribedAt = LocalDateTime.now();

    private LocalDateTime lastActiveAt;
}
