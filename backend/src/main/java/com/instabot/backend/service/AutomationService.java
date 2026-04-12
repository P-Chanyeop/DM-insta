package com.instabot.backend.service;

import com.instabot.backend.dto.AutomationDto;
import com.instabot.backend.entity.Automation;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.AutomationRepository;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AutomationService {

    private final AutomationRepository automationRepository;
    private final UserRepository userRepository;
    private final FlowRepository flowRepository;

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
            Map.entry("환영 메시지", Automation.AutomationType.WELCOME_MESSAGE),
            Map.entry("ICEBREAKER", Automation.AutomationType.ICEBREAKER),
            Map.entry("아이스브레이커", Automation.AutomationType.ICEBREAKER)
    );

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
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Automation automation = Automation.builder()
                .user(user)
                .name(request.getName())
                .type(parseType(request.getType()))
                .keyword(request.getKeyword())
                .matchType(parseMatchType(request.getMatchType()))
                .postId(request.getPostId())
                .build();

        if (request.getFlowId() != null) {
            automation.setFlow(flowRepository.findById(request.getFlowId()).orElse(null));
        }

        return toResponse(automationRepository.save(automation));
    }

    @Transactional
    public AutomationDto.Response toggleAutomation(Long id) {
        Automation automation = automationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("자동화를 찾을 수 없습니다."));
        automation.setActive(!automation.isActive());
        return toResponse(automationRepository.save(automation));
    }

    @Transactional
    public void deleteAutomation(Long id) {
        automationRepository.deleteById(id);
    }

    private AutomationDto.Response toResponse(Automation a) {
        return AutomationDto.Response.builder()
                .id(a.getId())
                .name(a.getName())
                .type(a.getType().name())
                .keyword(a.getKeyword())
                .matchType(a.getMatchType().name())
                .postId(a.getPostId())
                .flowId(a.getFlow() != null ? a.getFlow().getId() : null)
                .active(a.isActive())
                .triggeredCount(a.getTriggeredCount())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
