package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "custom_fields")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomField {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FieldType fieldType = FieldType.TEXT;

    private String defaultValue;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum FieldType { TEXT, NUMBER, BOOLEAN, DATE, EMAIL, PHONE, URL }
}
