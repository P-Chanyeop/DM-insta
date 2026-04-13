package com.instabot.backend.repository;

import com.instabot.backend.entity.PendingFlowAction;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PendingFlowActionRepository extends JpaRepository<PendingFlowAction, Long> {

    /**
     * 특정 사용자의 특정 대기 상태인 가장 최근 PendingFlowAction 조회
     */
    Optional<PendingFlowAction> findFirstBySenderIgIdAndPendingStepOrderByCreatedAtDesc(
            String senderIgId, PendingStep pendingStep);

    /**
     * 특정 사용자의 활성(미완료+미만료) PendingFlowAction 조회
     */
    @Query("SELECT p FROM PendingFlowAction p WHERE p.senderIgId = :senderIgId " +
            "AND p.pendingStep <> 'COMPLETED' AND p.expiresAt > :now " +
            "ORDER BY p.createdAt DESC")
    Optional<PendingFlowAction> findActiveBySenderIgId(String senderIgId, LocalDateTime now);

    /**
     * 만료된 PendingFlowAction 정리
     */
    @Modifying
    @Query("DELETE FROM PendingFlowAction p WHERE p.expiresAt < :now OR p.pendingStep = 'COMPLETED'")
    int cleanupExpiredActions(LocalDateTime now);
}
