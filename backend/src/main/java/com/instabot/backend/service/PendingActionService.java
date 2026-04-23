package com.instabot.backend.service;

import com.instabot.backend.dto.PendingActionDto;
import com.instabot.backend.entity.PendingFlowAction;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.PendingFlowActionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 사용자의 대기중(Pending) 플로우 액션 조회/정리 서비스.
 *
 * 스테일 Pending이 남아있으면 WebhookEventService.handleDmKeywordTrigger 가
 * 새 DM 키워드를 스킵하는 경우가 있어, 관리 패널에서 수동 폐기할 수 있도록 한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PendingActionService {

    private final PendingFlowActionRepository pendingFlowActionRepository;

    @Transactional(readOnly = true)
    public List<PendingActionDto.Response> listActive(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return pendingFlowActionRepository.findActiveByUserId(userId, now).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PendingActionDto.CleanupResult cleanupAll(Long userId) {
        int count = pendingFlowActionRepository.completeAllByUserId(userId);
        log.info("관리자 수동 정리 — userId={}, cleanedCount={}", userId, count);
        return PendingActionDto.CleanupResult.builder().cleanedCount(count).build();
    }

    @Transactional
    public void completeOne(Long userId, Long id) {
        PendingFlowAction p = pendingFlowActionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Pending 액션을 찾을 수 없습니다: id=" + id));
        p.setPendingStep(PendingStep.COMPLETED);
        pendingFlowActionRepository.save(p);
        log.info("관리자 수동 폐기 — userId={}, id={}, sender={}", userId, id, p.getSenderIgId());
    }

    private PendingActionDto.Response toResponse(PendingFlowAction p) {
        return PendingActionDto.Response.builder()
                .id(p.getId())
                .senderIgId(p.getSenderIgId())
                .pendingStep(p.getPendingStep() != null ? p.getPendingStep().name() : null)
                .flowName(p.getFlow() != null ? p.getFlow().getName() : null)
                .flowId(p.getFlow() != null ? p.getFlow().getId() : null)
                .triggerKeyword(p.getTriggerKeyword())
                .currentNodeId(p.getCurrentNodeId())
                .igAccountUsername(p.getInstagramAccount() != null ? p.getInstagramAccount().getUsername() : null)
                .createdAt(p.getCreatedAt())
                .expiresAt(p.getExpiresAt())
                .scheduledResumeAt(p.getScheduledResumeAt())
                .expired(p.isExpired())
                .build();
    }
}
