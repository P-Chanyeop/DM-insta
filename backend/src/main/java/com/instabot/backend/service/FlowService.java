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

@Service
@RequiredArgsConstructor
public class FlowService {

    private final FlowValidationService flowValidationService;

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

        Flow flow = Flow.builder()
                .user(user)
                .name(request.getName())
                .triggerType(parseTriggerType(request.getTriggerType()))
                .flowData(request.getFlowData())
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
        if (request.getFlowData() != null) flow.setFlowData(request.getFlowData());
        if (request.getStatus() != null) flow.setStatus(Flow.FlowStatus.valueOf(request.getStatus()));

        // active=true 설정 시 검증 (flowData가 같이 업데이트되면 새 데이터 기준)
        if (Boolean.TRUE.equals(request.getActive()) && !flow.isActive()) {
            String dataToValidate = request.getFlowData() != null ? request.getFlowData() : flow.getFlowData();
            List<String> errors = flowValidationService.validateForActivation(dataToValidate);
            if (!errors.isEmpty()) {
                throw new IllegalStateException("플로우를 활성화할 수 없습니다: " + String.join(", ", errors));
            }
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

        // 비활성 → 활성 전환 시 검증
        if (!flow.isActive()) {
            List<String> errors = flowValidationService.validateForActivation(flow.getFlowData());
            if (!errors.isEmpty()) {
                throw new IllegalStateException("플로우를 활성화할 수 없습니다: " + String.join(", ", errors));
            }
        }

        flow.setActive(!flow.isActive());
        return toResponse(flowRepository.save(flow));
    }

    private FlowDto.Response toResponse(Flow flow) {
        return FlowDto.Response.builder()
                .id(flow.getId())
                .name(flow.getName())
                .triggerType(flow.getTriggerType().name())
                .status(flow.getStatus().name())
                .active(flow.isActive())
                .flowData(flow.getFlowData())
                .sentCount(flow.getSentCount())
                .openRate(flow.getOpenRate())
                .createdAt(flow.getCreatedAt())
                .updatedAt(flow.getUpdatedAt())
                .build();
    }
}
