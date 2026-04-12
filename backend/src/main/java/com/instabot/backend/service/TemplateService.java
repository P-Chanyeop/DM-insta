package com.instabot.backend.service;

import com.instabot.backend.dto.TemplateDto;
import com.instabot.backend.entity.Template;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateRepository templateRepository;

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

    private TemplateDto.Response toResponse(Template t) {
        return TemplateDto.Response.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .category(t.getCategory())
                .flowData(t.getFlowData())
                .icon(t.getIcon())
                .gradientColors(t.getGradientColors())
                .usageCount(t.getUsageCount())
                .rating(t.getRating())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
