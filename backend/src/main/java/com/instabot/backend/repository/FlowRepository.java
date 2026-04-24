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
     * 활성 플로우를 특정 triggerType 으로 필터 + 생성 순 정렬.
     * Webhook dispatch 경로에서 호출 — 등록 순서대로 매칭 우선순위를 주기 위함.
     */
    List<Flow> findByUserIdAndActiveTrueAndTriggerTypeOrderByCreatedAtAsc(
            Long userId, Flow.TriggerType triggerType);
}
