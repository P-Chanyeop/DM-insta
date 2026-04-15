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
