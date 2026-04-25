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
     * 특정 단계의 활성 PendingFlowAction 조회 — 이메일 캡처 등 단계별 조회용
     */
    @Query("SELECT p FROM PendingFlowAction p WHERE p.senderIgId = :senderIgId " +
            "AND p.pendingStep = :step AND p.expiresAt > :now " +
            "ORDER BY p.createdAt DESC")
    Optional<PendingFlowAction> findActiveBySenderIgIdAndStep(
            String senderIgId, PendingStep step, LocalDateTime now);

    /**
     * flowId + senderIgId + step 으로 활성 PendingFlowAction 조회 — 병렬 플로우 라우팅용.
     * nodeId 까지 지정하면 해당 노드의 대기만 매칭, null 이면 플로우 내 임의.
     */
    @Query("SELECT p FROM PendingFlowAction p " +
            "WHERE p.flow.id = :flowId AND p.senderIgId = :senderIgId " +
            "AND p.pendingStep = :step AND p.expiresAt > :now " +
            "AND (:nodeId IS NULL OR p.currentNodeId = :nodeId) " +
            "ORDER BY p.createdAt DESC")
    Optional<PendingFlowAction> findActiveByFlowAndSenderAndStep(
            Long flowId, String senderIgId, PendingStep step, String nodeId, LocalDateTime now);

    /**
     * senderIgId 없이 flowId + nodeId + step 으로 활성 PendingFlowAction 조회.
     *
     * 댓글 트리거 → 오프닝 DM → 버튼 클릭 시나리오에서, 댓글 webhook 이 주는 sender 는
     * 댓글 작성자의 공개 IG 사용자 ID 인데 postback webhook 이 주는 sender 는 IGSID
     * (페이지 스코프 ID) 라 두 ID 가 달라서 senderIgId 일치 lookup 이 실패한다.
     * 이 fallback 은 그 케이스를 잡기 위함이며, 매칭 후 pending 의 senderIgId 를
     * 현재 IGSID 로 업데이트해 이후 단계는 정상 lookup 된다.
     *
     * 다중 발신자가 동시에 같은 노드에서 대기 중일 때 가장 최근 것을 반환 — 정확도는
     * 떨어지지만 senderIgId 매칭 실패한 케이스에 한해서만 호출되므로 race 영향 제한적.
     *
     * @param flowId  플로우 ID (postback payload 에서 추출)
     * @param step    기대 단계 (AWAITING_POSTBACK / AWAITING_FOLLOW 등)
     * @param nodeId  현재 노드 ID (postback payload 에서 추출, null 이면 플로우 내 임의)
     * @param now     만료 비교 기준 시각
     * @return 가장 최근 매칭 pending 또는 empty
     */
    @Query("SELECT p FROM PendingFlowAction p " +
            "WHERE p.flow.id = :flowId " +
            "AND p.pendingStep = :step AND p.expiresAt > :now " +
            "AND (:nodeId IS NULL OR p.currentNodeId = :nodeId) " +
            "ORDER BY p.createdAt DESC")
    Optional<PendingFlowAction> findActiveByFlowAndStepWithoutSender(
            Long flowId, PendingStep step, String nodeId, LocalDateTime now);

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

    /**
     * 원자적 전이 (compare-and-set): 현재 단계가 expectedStep 일 때만 COMPLETED 로 변경.
     * 두 스레드가 같은 pending 을 동시에 잡으려 할 때 한 쪽만 rowCount=1 이 나온다.
     * 중복 postback 이벤트로 메인 DM 이 두 번 발송되는 것을 차단한다.
     *
     * @return 변경된 row 수 (1 이면 내가 이김, 0 이면 다른 스레드가 먼저 처리함)
     */
    @Modifying
    @Query("UPDATE PendingFlowAction p SET p.pendingStep = 'COMPLETED' " +
            "WHERE p.id = :id AND p.pendingStep = :expectedStep")
    int completeIfStill(Long id, PendingStep expectedStep);
}
