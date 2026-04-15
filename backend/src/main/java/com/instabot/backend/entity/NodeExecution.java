package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 플로우 노드별 실행 기록
 * - 각 노드의 도달/완료/이탈 추적
 * - 퍼널 시각화 및 전환율 분석에 사용
 */
@Entity
@Table(name = "node_executions", indexes = {
        @Index(name = "idx_ne_flow_node", columnList = "flowId, nodeType, executedAt"),
        @Index(name = "idx_ne_flow_date", columnList = "flowId, executedAt")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NodeExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long flowId;

    @Column(nullable = false)
    private String nodeType;  // trigger, commentReply, openingDm, followCheck, emailCollection, condition, mainDm, carousel, aiResponse, followUp

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Action action = Action.ENTERED;

    private Long contactId;

    @Builder.Default
    private LocalDateTime executedAt = LocalDateTime.now();

    @Lob
    @Column(columnDefinition = "TEXT")
    private String metadata;  // JSON: 추가 정보 (조건 결과, 선택지 등)

    public enum Action {
        ENTERED,     // 노드 진입
        COMPLETED,   // 노드 완료
        DROPPED      // 노드 이탈 (조건 미충족, 에러 등)
    }
}
