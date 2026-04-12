package com.instabot.backend.service;

import com.instabot.backend.dto.IntegrationDto;
import com.instabot.backend.entity.Integration;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.IntegrationRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final IntegrationRepository integrationRepository;
    private final UserRepository userRepository;

    public List<IntegrationDto.Response> getIntegrations(Long userId) {
        return integrationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public IntegrationDto.Response createIntegration(Long userId, IntegrationDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Integration integ = Integration.builder()
                .user(user)
                .type(Integration.IntegrationType.valueOf(request.getType()))
                .name(request.getName())
                .config(request.getConfig())
                .build();

        return toResponse(integrationRepository.save(integ));
    }

    @Transactional
    public IntegrationDto.Response toggleIntegration(Long id) {
        Integration integ = integrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("연동을 찾을 수 없습니다."));
        integ.setActive(!integ.isActive());
        return toResponse(integrationRepository.save(integ));
    }

    @Transactional
    public void deleteIntegration(Long id) {
        integrationRepository.deleteById(id);
    }

    private IntegrationDto.Response toResponse(Integration i) {
        return IntegrationDto.Response.builder()
                .id(i.getId())
                .type(i.getType().name())
                .name(i.getName())
                .active(i.isActive())
                .createdAt(i.getCreatedAt())
                .lastSyncAt(i.getLastSyncAt())
                .build();
    }
}
