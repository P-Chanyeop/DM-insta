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

    /** 고객 추후 관리용 이메일 — Instagram DM API 는 제공하지 않으므로 사용자 수동 입력 필드. */
    @Column(length = 320)
    private String email;

    /** 고객 추후 관리용 전화번호 — Instagram DM API 는 제공하지 않으므로 사용자 수동 입력 필드. */
    @Column(length = 50)
    private String phone;

    @Builder.Default
    private LocalDateTime subscribedAt = LocalDateTime.now();

    private LocalDateTime lastActiveAt;

    /** 이 Contact 로부터 첫 DM 을 수신한 시점 — "첫 메시지" UI 및 고객 유입 분석용.
     *  Contact 최초 생성 시점(첫 인바운드 웹훅 처리) 과 동일하지만 명시적으로 별도 컬럼으로 보존. */
    @Column(name = "first_message_at")
    private LocalDateTime firstMessageAt;

    /** Instagram 팔로워 수 — Graph API (`instagram_manage_insights` 권한) 로 주기적 동기화 예정.
     *  App Review 통과 전에는 null 로 남고 UI 는 "—" 표시. */
    @Column(name = "follower_count")
    private Integer followerCount;
}
