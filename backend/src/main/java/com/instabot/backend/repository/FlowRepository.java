package com.instabot.backend.repository;

import com.instabot.backend.entity.Flow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FlowRepository extends JpaRepository<Flow, Long> {
    List<Flow> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Flow> findByUserIdAndActiveTrue(Long userId);
    long countByUserId(Long userId);
    long countByUserIdAndActiveTrue(Long userId);

    /**
     * 활성 플로우를 특정 triggerType 으로 필터 + 우선순위 ASC, 생성순 tiebreaker.
     * Webhook dispatch 경로에서 호출 — 유저가 지정한 우선순위대로 매칭.
     */
    List<Flow> findByUserIdAndActiveTrueAndTriggerTypeOrderByPriorityAscCreatedAtAsc(
            Long userId, Flow.TriggerType triggerType);

    /**
     * 특정 유저의 모든 활성 플로우를 triggerType + priority 순으로 조회.
     * 충돌 감지 정적 분석에서 사용.
     */
    List<Flow> findByUserIdAndActiveTrueOrderByTriggerTypeAscPriorityAscCreatedAtAsc(Long userId);
}
