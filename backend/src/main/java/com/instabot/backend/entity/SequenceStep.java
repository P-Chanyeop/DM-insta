package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sequence_steps")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SequenceStep {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sequence_id", nullable = false)
    private Sequence sequence;

    private int stepOrder;
    private String name;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String messageContent; // JSON

    private int delayMinutes; // delay before this step

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StepType type = StepType.MESSAGE;

    private Double openRate;
    private Double clickRate;

    public enum StepType { MESSAGE, CONDITION, DELAY, TAG, NOTIFY }
}
