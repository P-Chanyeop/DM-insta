package com.instabot.backend.service;

import com.instabot.backend.dto.GrowthToolDto;
import com.instabot.backend.entity.GrowthTool;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.GrowthToolRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GrowthToolService {

    private final GrowthToolRepository growthToolRepository;
    private final UserRepository userRepository;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    public List<GrowthToolDto.Response> getTools(Long userId) {
        return growthToolRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public GrowthToolDto.Response createTool(Long userId, GrowthToolDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        GrowthTool tool = GrowthTool.builder()
                .user(user)
                .type(GrowthTool.ToolType.valueOf(request.getType()))
                .name(request.getName())
                .refUrl(request.getRefUrl())
                .config(request.getConfig())
                .build();

        tool = growthToolRepository.save(tool);

        // Ref Link 타입이면 추적 URL 생성
        if (tool.getType() == GrowthTool.ToolType.REF_LINK || tool.getType() == GrowthTool.ToolType.QR_CODE) {
            String baseUrl = appBaseUrl.endsWith("/") ? appBaseUrl.substring(0, appBaseUrl.length() - 1) : appBaseUrl;
            String trackingUrl = baseUrl + "/r/" + tool.getId();
            tool.setConfig(tool.getConfig() != null
                    ? tool.getConfig() + ",\"trackingUrl\":\"" + trackingUrl + "\""
                    : "{\"trackingUrl\":\"" + trackingUrl + "\"}");
            growthToolRepository.save(tool);
        }

        return toResponse(tool);
    }

    @Transactional
    public void deleteTool(Long userId, Long id) {
        GrowthTool tool = growthToolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("성장 도구를 찾을 수 없습니다."));
        if (!tool.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("성장 도구를 찾을 수 없습니다.");
        }
        growthToolRepository.delete(tool);
    }

    @Transactional
    public GrowthToolDto.Response toggleTool(Long userId, Long id) {
        GrowthTool tool = growthToolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("성장 도구를 찾을 수 없습니다."));
        if (!tool.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("성장 도구를 찾을 수 없습니다.");
        }
        tool.setActive(!tool.isActive());
        return toResponse(growthToolRepository.save(tool));
    }

    private GrowthToolDto.Response toResponse(GrowthTool t) {
        return GrowthToolDto.Response.builder()
                .id(t.getId())
                .type(t.getType().name())
                .name(t.getName())
                .refUrl(t.getRefUrl())
                .config(t.getConfig())
                .clickCount(t.getClickCount())
                .active(t.isActive())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
