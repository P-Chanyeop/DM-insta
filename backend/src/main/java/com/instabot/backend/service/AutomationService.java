package com.instabot.backend.service;

import com.instabot.backend.dto.AutomationDto;
import com.instabot.backend.entity.Automation;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.AutomationRepository;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AutomationService {

    private final AutomationRepository automationRepository;
    private final UserRepository userRepository;
    private final FlowRepository flowRepository;
    private final QuotaService quotaService;

    private static final Map<String, Automation.AutomationType> TYPE_LABELS = Map.ofEntries(
            Map.entry("DM_KEYWORD", Automation.AutomationType.DM_KEYWORD),
            Map.entry("DM 키워드", Automation.AutomationType.DM_KEYWORD),
            Map.entry("COMMENT_TRIGGER", Automation.AutomationType.COMMENT_TRIGGER),
            Map.entry("COMMENT", Automation.AutomationType.COMMENT_TRIGGER),
            Map.entry("댓글 트리거", Automation.AutomationType.COMMENT_TRIGGER),
            Map.entry("STORY_MENTION", Automation.AutomationType.STORY_MENTION),
            Map.entry("스토리 멘션", Automation.AutomationType.STORY_MENTION),
            Map.entry("STORY_REPLY", Automation.AutomationType.STORY_REPLY),
            Map.entry("스토리 답장", Automation.AutomationType.STORY_REPLY),
            Map.entry("WELCOME_MESSAGE", Automation.AutomationType.WELCOME_MESSAGE),
            Map.entry("WELCOME_DM", Automation.AutomationType.WELCOME_MESSAGE), // 프론트 alias 호환
            Map.entry("환영 메시지", Automation.AutomationType.WELCOME_MESSAGE),
            Map.entry("ICEBREAKER", Automation.AutomationType.ICEBREAKER),
            Map.entry("아이스브레이커", Automation.AutomationType.ICEBREAKER)
    );

    // 키워드 없이 사용자당 1개만 존재하는 타입 (upsert 시 (user, type)만 매칭)
    private static boolean isSingletonType(Automation.AutomationType type) {
        return type == Automation.AutomationType.WELCOME_MESSAGE
                || type == Automation.AutomationType.STORY_MENTION
                || type == Automation.AutomationType.STORY_REPLY
                || type == Automation.AutomationType.ICEBREAKER;
    }

    private static final Map<String, Automation.MatchType> MATCH_LABELS = Map.ofEntries(
            Map.entry("CONTAINS", Automation.MatchType.CONTAINS),
            Map.entry("포함", Automation.MatchType.CONTAINS),
            Map.entry("EXACT", Automation.MatchType.EXACT),
            Map.entry("정확", Automation.MatchType.EXACT),
            Map.entry("STARTS_WITH", Automation.MatchType.CONTAINS) // fallback
    );

    private Automation.AutomationType parseType(String input) {
        if (input == null || input.isBlank()) return Automation.AutomationType.DM_KEYWORD;
        Automation.AutomationType mapped = TYPE_LABELS.get(input.trim());
        if (mapped != null) return mapped;
        try {
            return Automation.AutomationType.valueOf(input.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Automation.AutomationType.DM_KEYWORD;
        }
    }

    private Automation.MatchType parseMatchType(String input) {
        if (input == null || input.isBlank()) return Automation.MatchType.CONTAINS;
        Automation.MatchType mapped = MATCH_LABELS.get(input.trim());
        if (mapped != null) return mapped;
        try {
            return Automation.MatchType.valueOf(input.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Automation.MatchType.CONTAINS;
        }
    }

    public List<AutomationDto.Response> getAutomations(Long userId) {
        return automationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AutomationDto.Response> getAutomationsByType(Long userId, String type) {
        return automationRepository.findByUserIdAndType(userId, parseType(type)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AutomationDto.Response createAutomation(Long userId, AutomationDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // 플랜별 자동화 할당량 검증
        quotaService.checkAutomationQuota(user);

        Automation automation = Automation.builder()
                .user(user)
                .name(request.getName())
                .type(parseType(request.getType()))
                .keyword(request.getKeyword())
                .matchType(parseMatchType(request.getMatchType()))
                .postId(request.getPostId())
                .responseMessage(request.getResponseMessage())
                .active(request.getActive() == null ? true : request.getActive())
                .build();

        if (request.getFlowId() != null) {
            automation.setFlow(flowRepository.findById(request.getFlowId()).orElse(null));
        }

        return toResponse(automationRepository.save(automation));
    }

    /**
     * 온보딩 등 반복 호출 환경에서 중복 생성 방지를 위한 upsert.
     * - 싱글톤 타입(WELCOME_MESSAGE / STORY_MENTION / STORY_REPLY / ICEBREAKER): (user, type)로 기존 레코드 찾기
     * - 키워드 타입(DM_KEYWORD / COMMENT_TRIGGER): (user, type, keyword)로 기존 레코드 찾기
     * 기존 레코드 있으면 필드 업데이트, 없으면 신규 생성(Quota 검증 포함).
     */
    @Transactional
    public AutomationDto.Response upsertAutomation(Long userId, AutomationDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        Automation.AutomationType type = parseType(request.getType());
        String keyword = request.getKeyword();

        Optional<Automation> existing;
        if (isSingletonType(type)) {
            existing = automationRepository.findFirstByUserIdAndType(userId, type);
        } else if (keyword != null && !keyword.isBlank()) {
            existing = automationRepository.findFirstByUserIdAndTypeAndKeyword(userId, type, keyword);
        } else if (request.getName() != null && !request.getName().isBlank()) {
            // 키워드 없는 COMMENT_TRIGGER 등 — name으로 매칭 (온보딩 성장 도구 시나리오)
            existing = automationRepository.findFirstByUserIdAndTypeAndName(userId, type, request.getName());
        } else {
            existing = Optional.empty();
        }

        if (existing.isPresent()) {
            Automation a = existing.get();
            if (request.getName() != null && !request.getName().isBlank()) a.setName(request.getName());
            if (keyword != null) a.setKeyword(keyword);
            a.setMatchType(parseMatchType(request.getMatchType()));
            if (request.getPostId() != null) a.setPostId(request.getPostId());
            if (request.getResponseMessage() != null) a.setResponseMessage(request.getResponseMessage());
            if (request.getActive() != null) a.setActive(request.getActive());
            if (request.getFlowId() != null) {
                a.setFlow(flowRepository.findById(request.getFlowId()).orElse(null));
            }
            return toResponse(automationRepository.save(a));
        }

        // 신규 생성 — Quota 검증
        quotaService.checkAutomationQuota(user);

        Automation automation = Automation.builder()
                .user(user)
                .name(request.getName())
                .type(type)
                .keyword(keyword)
                .matchType(parseMatchType(request.getMatchType()))
                .postId(request.getPostId())
                .responseMessage(request.getResponseMessage())
                .active(request.getActive() == null ? true : request.getActive())
                .build();

        if (request.getFlowId() != null) {
            automation.setFlow(flowRepository.findById(request.getFlowId()).orElse(null));
        }

        return toResponse(automationRepository.save(automation));
    }

    @Transactional
    public AutomationDto.Response toggleAutomation(Long userId, Long id) {
        Automation automation = automationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("자동화를 찾을 수 없습니다."));
        if (!automation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("자동화를 찾을 수 없습니다.");
        }
        automation.setActive(!automation.isActive());
        return toResponse(automationRepository.save(automation));
    }

    @Transactional
    public void deleteAutomation(Long userId, Long id) {
        Automation automation = automationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("자동화를 찾을 수 없습니다."));
        if (!automation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("자동화를 찾을 수 없습니다.");
        }
        automationRepository.delete(automation);
    }

    private AutomationDto.Response toResponse(Automation a) {
        return AutomationDto.Response.builder()
                .id(a.getId())
                .name(a.getName())
                .type(a.getType().name())
                .keyword(a.getKeyword())
                .matchType(a.getMatchType().name())
                .postId(a.getPostId())
                .responseMessage(a.getResponseMessage())
                .flowId(a.getFlow() != null ? a.getFlow().getId() : null)
                .active(a.isActive())
                .triggeredCount(a.getTriggeredCount())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
