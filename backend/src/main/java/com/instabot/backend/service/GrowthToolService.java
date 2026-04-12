package com.instabot.backend.service;

import com.instabot.backend.dto.GrowthToolDto;
import com.instabot.backend.entity.GrowthTool;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.GrowthToolRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GrowthToolService {

    private final GrowthToolRepository growthToolRepository;
    private final UserRepository userRepository;

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

        return toResponse(growthToolRepository.save(tool));
    }

    @Transactional
    public void deleteTool(Long id) {
        growthToolRepository.deleteById(id);
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
