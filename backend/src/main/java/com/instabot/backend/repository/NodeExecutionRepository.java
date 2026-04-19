package com.instabot.backend.repository;

import com.instabot.backend.entity.NodeExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NodeExecutionRepository extends JpaRepository<NodeExecution, Long> {

    /**
     * 플로우별 노드 타입별 액션 집계 (퍼널 데이터)
     * 결과: [nodeType, action, count]
     */
    @Query("SELECT ne.nodeType, ne.action, COUNT(ne) FROM NodeExecution ne " +
           "WHERE ne.flowId = :flowId AND ne.executedAt >= :since " +
           "GROUP BY ne.nodeType, ne.action ORDER BY ne.nodeType")
    List<Object[]> countByFlowIdGroupByNodeTypeAndAction(
            @Param("flowId") Long flowId,
            @Param("since") LocalDateTime since);

    /**
     * 사용자의 전체 플로우 전환율 집계: trigger COMPLETED 수, 최종 노드 COMPLETED 수
     */
    @Query("SELECT ne.action, COUNT(ne) FROM NodeExecution ne " +
           "WHERE ne.flowId IN :flowIds AND ne.nodeType = 'trigger' AND ne.executedAt >= :since " +
           "GROUP BY ne.action")
    List<Object[]> countTriggerActionsByFlowIds(
            @Param("flowIds") List<Long> flowIds,
            @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(ne) FROM NodeExecution ne " +
           "WHERE ne.flowId IN :flowIds AND ne.action = 'COMPLETED' AND ne.executedAt >= :since")
    long countAllCompletedByFlowIds(
            @Param("flowIds") List<Long> flowIds,
            @Param("since") LocalDateTime since);

    /**
     * 특정 노드의 일별 실행 추이
     * 결과: [date, action, count]
     */
    @Query("SELECT CAST(ne.executedAt AS LocalDate), ne.action, COUNT(ne) FROM NodeExecution ne " +
           "WHERE ne.flowId = :flowId AND ne.nodeType = :nodeType AND ne.executedAt >= :since " +
           "GROUP BY CAST(ne.executedAt AS LocalDate), ne.action ORDER BY CAST(ne.executedAt AS LocalDate)")
    List<Object[]> countDailyByFlowIdAndNodeType(
            @Param("flowId") Long flowId,
            @Param("nodeType") String nodeType,
            @Param("since") LocalDateTime since);
}
