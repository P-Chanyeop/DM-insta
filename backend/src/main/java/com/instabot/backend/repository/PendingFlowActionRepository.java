package com.instabot.backend.repository;

import com.instabot.backend.entity.PendingFlowAction;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
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
     * 재개 시각이 도래한 AWAITING_DELAY 액션 조회
     */
    @Query("SELECT p FROM PendingFlowAction p WHERE p.pendingStep = 'AWAITING_DELAY' " +
            "AND p.scheduledResumeAt <= :now AND p.expiresAt > :now")
    List<PendingFlowAction> findDelayActionsReadyToResume(LocalDateTime now);

    /**
     * 만료된 PendingFlowAction 정리
     */
    @Modifying
    @Query("DELETE FROM PendingFlowAction p WHERE p.expiresAt < :now OR p.pendingStep = 'COMPLETED'")
    int cleanupExpiredActions(LocalDateTime now);

    /**
     * 특정 사용자의 IG 계정에 걸린 활성 PendingFlowAction 전체 조회
     */
    @Query("SELECT p FROM PendingFlowAction p " +
            "JOIN FETCH p.flow f " +
            "JOIN FETCH p.instagramAccount ia " +
            "WHERE ia.user.id = :userId " +
            "AND p.pendingStep <> 'COMPLETED' " +
            "AND p.expiresAt > :now " +
            "ORDER BY p.createdAt DESC")
    List<PendingFlowAction> findActiveByUserId(Long userId, LocalDateTime now);

    /**
     * ID + 소유자(userId) 동시 조회 (권한 체크용)
     */
    @Query("SELECT p FROM PendingFlowAction p " +
            "JOIN FETCH p.flow f " +
            "JOIN FETCH p.instagramAccount ia " +
            "WHERE p.id = :id AND ia.user.id = :userId")
    Optional<PendingFlowAction> findByIdAndUserId(Long id, Long userId);

    /**
     * 특정 사용자의 활성 Pending을 모두 COMPLETED 로 마킹
     */
    @Modifying
    @Query("UPDATE PendingFlowAction p SET p.pendingStep = 'COMPLETED' " +
            "WHERE p.id IN (" +
            "  SELECT p2.id FROM PendingFlowAction p2 " +
            "  WHERE p2.instagramAccount.user.id = :userId " +
            "  AND p2.pendingStep <> 'COMPLETED'" +
            ")")
    int completeAllByUserId(Long userId);
}
