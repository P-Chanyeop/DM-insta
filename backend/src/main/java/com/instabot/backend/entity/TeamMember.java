package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_members",
       uniqueConstraints = @UniqueConstraint(name = "uk_team_user", columnNames = {"team_owner_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamMember {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_owner_id", nullable = false)
    private Long teamOwnerId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.MEMBER;

    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    public enum Role { OWNER, ADMIN, MEMBER, VIEWER }
}
