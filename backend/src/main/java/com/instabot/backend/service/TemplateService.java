package com.instabot.backend.service;

import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.dto.TemplateDto;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.Template;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.TemplateRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final FlowRepository flowRepository;
    private final UserRepository userRepository;
    private final QuotaService quotaService;

    public List<TemplateDto.Response> getTemplates(String category) {
        List<Template> templates;
        if (category != null && !category.isBlank() && !category.equals("전체")) {
            templates = templateRepository.findByCategoryAndIsPublicTrueOrderByUsageCountDesc(category);
        } else {
            templates = templateRepository.findByIsPublicTrueOrderByUsageCountDesc();
        }
        return templates.stream().map(this::toResponse).toList();
    }

    @Transactional
    public void incrementUsage(Long id) {
        Template t = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("템플릿을 찾을 수 없습니다."));
        t.setUsageCount(t.getUsageCount() + 1);
        templateRepository.save(t);
    }

    /**
     * 템플릿 "사용하기" → 템플릿의 flowData를 복사해서 새 Flow 생성
     */
    @Transactional
    public FlowDto.Response useTemplate(Long templateId, Long userId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("템플릿을 찾을 수 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // 플랜별 플로우 할당량 검증 — 템플릿 경유 생성도 동일하게 막아야 함.
        quotaService.checkFlowQuota(user);

        Flow flow = Flow.builder()
                .user(user)
                .name(template.getName() + " (템플릿)")
                .flowData(template.getFlowData())
                .triggerType(Flow.TriggerType.KEYWORD)
                .status(Flow.FlowStatus.DRAFT)
                .build();

        flow = flowRepository.save(flow);

        // 사용 횟수 증가
        template.setUsageCount(template.getUsageCount() + 1);
        templateRepository.save(template);

        return FlowDto.Response.builder()
                .id(flow.getId())
                .name(flow.getName())
                .triggerType(flow.getTriggerType().name())
                .status(flow.getStatus().name())
                .active(flow.isActive())
                .flowData(flow.getFlowData())
                .createdAt(flow.getCreatedAt())
                .build();
    }

    private TemplateDto.Response toResponse(Template t) {
        return TemplateDto.Response.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .category(t.getCategory())
                .flowData(t.getFlowData())
                .icon(t.getIcon())
                .gradientColors(t.getGradientColors())
                .previewImageUrl(t.getPreviewImageUrl())
                .usageCount(t.getUsageCount())
                .rating(t.getRating())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
