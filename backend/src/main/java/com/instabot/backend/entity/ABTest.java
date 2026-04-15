package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ab_tests", indexes = {
        @Index(name = "idx_abt_flow", columnList = "flowId"),
        @Index(name = "idx_abt_flow_name", columnList = "flowId, testName")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ABTest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long flowId;

    @Column(nullable = false)
    private String testName;

    /** variant A 비율 (0~100), B = 100 - variantA */
    @Builder.Default
    private int variantAPercent = 50;

    @Builder.Default
    private long variantACount = 0;

    @Builder.Default
    private long variantBCount = 0;

    @Builder.Default
    private long variantACompleted = 0;

    @Builder.Default
    private long variantBCompleted = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private TestStatus status = TestStatus.RUNNING;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime endedAt;

    public enum TestStatus { RUNNING, PAUSED, COMPLETED }

    public double getVariantARate() {
        return variantACount == 0 ? 0 : (double) variantACompleted / variantACount * 100;
    }

    public double getVariantBRate() {
        return variantBCount == 0 ? 0 : (double) variantBCompleted / variantBCount * 100;
    }
}
