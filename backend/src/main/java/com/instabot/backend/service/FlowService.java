package com.instabot.backend.service;

import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlowService {

    private final FlowValidationService flowValidationService;
    private final FlowConflictService flowConflictService;
    private final FlowTriggerNormalizer flowTriggerNormalizer;

    private final FlowRepository flowRepository;
    private final UserRepository userRepository;
    private final QuotaService quotaService;

    // Map Korean display labels and common aliases to canonical enum values
    private static final Map<String, Flow.TriggerType> TRIGGER_LABELS = Map.ofEntries(
            Map.entry("KEYWORD", Flow.TriggerType.KEYWORD),
            Map.entry("DM 키워드", Flow.TriggerType.KEYWORD),
            Map.entry("키워드", Flow.TriggerType.KEYWORD),
            Map.entry("COMMENT", Flow.TriggerType.COMMENT),
            Map.entry("댓글 트리거", Flow.TriggerType.COMMENT),
            Map.entry("댓글", Flow.TriggerType.COMMENT),
            Map.entry("STORY_MENTION", Flow.TriggerType.STORY_MENTION),
            Map.entry("스토리 멘션", Flow.TriggerType.STORY_MENTION),
            Map.entry("STORY_REPLY", Flow.TriggerType.STORY_REPLY),
            Map.entry("스토리 답장", Flow.TriggerType.STORY_REPLY),
            Map.entry("WELCOME", Flow.TriggerType.WELCOME),
            Map.entry("첫 메시지", Flow.TriggerType.WELCOME),
            Map.entry("환영 메시지", Flow.TriggerType.WELCOME),
            Map.entry("ICEBREAKER", Flow.TriggerType.ICEBREAKER),
            Map.entry("아이스브레이커", Flow.TriggerType.ICEBREAKER)
    );

    private Flow.TriggerType parseTriggerType(String input) {
        if (input == null || input.isBlank()) return Flow.TriggerType.KEYWORD;
        Flow.TriggerType mapped = TRIGGER_LABELS.get(input.trim());
        if (mapped != null) return mapped;
        try {
            return Flow.TriggerType.valueOf(input.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Flow.TriggerType.KEYWORD;
        }
    }

    public List<FlowDto.Response> getFlows(Long userId) {
        return flowRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public FlowDto.Response getFlow(Long userId, Long id) {
        Flow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
        if (!flow.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("플로우를 찾을 수 없습니다.");
        }
        return toResponse(flow);
    }

    @Transactional
    public FlowDto.Response createFlow(Long userId, FlowDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // 플랜별 플로우 할당량 검증
        quotaService.checkFlowQuota(user);

        String normalizedFlowData = flowTriggerNormalizer.normalize(request.getFlowData(), userId);

        Flow flow = Flow.builder()
                .user(user)
                .name(request.getName())
                .triggerType(parseTriggerType(request.getTriggerType()))
                .flowData(normalizedFlowData)
                .build();

        return toResponse(flowRepository.save(flow));
    }

    @Transactional
    public FlowDto.Response updateFlow(Long userId, Long id, FlowDto.UpdateRequest request) {
        Flow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
        if (!flow.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("플로우를 찾을 수 없습니다.");
        }

        if (request.getName() != null) flow.setName(request.getName());
        if (request.getFlowData() != null) {
            String normalizedFlowData = flowTriggerNormalizer.normalize(request.getFlowData(), userId);
            flow.setFlowData(normalizedFlowData);
        }
        if (request.getStatus() != null) flow.setStatus(Flow.FlowStatus.valueOf(request.getStatus()));
        if (request.getPriority() != null) flow.setPriority(request.getPriority());

        // active=true 설정 시 구조 검증 + 충돌 검증 (flowData가 같이 업데이트되면 새 데이터 기준)
        if (Boolean.TRUE.equals(request.getActive()) && !flow.isActive()) {
            runActivationGuards(flow, userId);
        }
        if (request.getActive() != null) flow.setActive(request.getActive());

        flow.setUpdatedAt(LocalDateTime.now());

        return toResponse(flowRepository.save(flow));
    }

    @Transactional
    public void deleteFlow(Long userId, Long id) {
        Flow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
        if (!flow.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("플로우를 찾을 수 없습니다.");
        }
        flowRepository.delete(flow);
    }

    @Transactional
    public FlowDto.Response toggleFlow(Long userId, Long id) {
        Flow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
        if (!flow.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("플로우를 찾을 수 없습니다.");
        }

        // 비활성 → 활성 전환 시 구조 + 충돌 검증
        if (!flow.isActive()) {
            runActivationGuards(flow, userId);
        }

        flow.setActive(!flow.isActive());
        return toResponse(flowRepository.save(flow));
    }

    /**
     * 저장된 Flow 의 충돌 리스트 조회 (저장/활성화 프리플라이트 용).
     */
    public List<FlowDto.Conflict> getConflicts(Long userId, Long id) {
        Flow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
        if (!flow.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("플로우를 찾을 수 없습니다.");
        }
        return flowConflictService.detectConflictsFor(flow, userId);
    }

    /**
     * 유저의 모든 활성 플로우 충돌 리포트 — 목록 페이지 뱃지 용.
     */
    public List<FlowDto.ConflictReport> getAllConflicts(Long userId) {
        return flowConflictService.detectAllForUser(userId);
    }

    /**
     * 드래그 리오더 — orderedIds 배열의 index 를 priority 로 저장.
     * 리스트에 포함되지 않은 Flow 는 손대지 않음(프론트가 특정 그룹만 보낼 때).
     */
    @Transactional
    public void reorderFlows(Long userId, List<Long> orderedIds) {
        if (orderedIds == null) return;
        for (int i = 0; i < orderedIds.size(); i++) {
            Long flowId = orderedIds.get(i);
            Flow flow = flowRepository.findById(flowId).orElse(null);
            if (flow == null) continue;
            if (!flow.getUser().getId().equals(userId)) continue; // 남의 Flow id 가 섞여 오면 skip
            flow.setPriority(i);
            flow.setUpdatedAt(LocalDateTime.now());
            flowRepository.save(flow);
        }
    }

    /**
     * 활성화 직전 게이트 — 구조 검증 실패 또는 HARD_BLOCK 충돌 발견 시 예외.
     * WARN 은 프론트가 이미 확인 모달을 띄우고 "계속" 을 눌렀다는 가정으로 통과시킴.
     */
    private void runActivationGuards(Flow flow, Long userId) {
        // 1. 구조 검증
        List<String> errors = flowValidationService.validateForActivation(flow.getFlowData());
        if (!errors.isEmpty()) {
            throw new IllegalStateException("플로우를 활성화할 수 없습니다: " + String.join(", ", errors));
        }
        // 2. 충돌 검증 — HARD_BLOCK 만 차단
        List<FlowDto.Conflict> conflicts = flowConflictService.detectConflictsFor(flow, userId);
        String hardReasons = conflicts.stream()
                .filter(c -> "HARD_BLOCK".equals(c.getSeverity()))
                .map(FlowDto.Conflict::getReason)
                .collect(Collectors.joining(" "));
        if (!hardReasons.isBlank()) {
            throw new IllegalStateException(hardReasons);
        }
    }

    private FlowDto.Response toResponse(Flow flow) {
        return FlowDto.Response.builder()
                .id(flow.getId())
                .name(flow.getName())
                .triggerType(flow.getTriggerType().name())
                .status(flow.getStatus().name())
                .active(flow.isActive())
                .flowData(flow.getFlowData())
                .priority(flow.getPriority())
                .sentCount(flow.getSentCount())
                .openRate(flow.getOpenRate())
                .createdAt(flow.getCreatedAt())
                .updatedAt(flow.getUpdatedAt())
                .build();
    }
}
