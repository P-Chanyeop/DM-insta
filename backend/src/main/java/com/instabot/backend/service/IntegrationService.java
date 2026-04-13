package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.IntegrationDto;
import com.instabot.backend.entity.Integration;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.IntegrationRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final IntegrationRepository integrationRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public List<IntegrationDto.Response> getIntegrations(Long userId) {
        return integrationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public IntegrationDto.Response createIntegration(Long userId, IntegrationDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        Integration integ = Integration.builder()
                .user(user)
                .type(Integration.IntegrationType.valueOf(request.getType()))
                .name(request.getName())
                .config(request.getConfig())
                .build();

        return toResponse(integrationRepository.save(integ));
    }

    @Transactional
    public IntegrationDto.Response toggleIntegration(Long userId, Long id) {
        Integration integ = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("연동을 찾을 수 없습니다."));
        if (!integ.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("연동을 찾을 수 없습니다.");
        }
        integ.setActive(!integ.isActive());
        return toResponse(integrationRepository.save(integ));
    }

    @Transactional
    public void deleteIntegration(Long userId, Long id) {
        Integration integ = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("연동을 찾을 수 없습니다."));
        if (!integ.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("연동을 찾을 수 없습니다.");
        }
        integrationRepository.delete(integ);
    }

    /**
     * Webhook 타입 연동에 이벤트 전송 (비동기)
     * - 사용자의 WEBHOOK 타입 활성 연동을 찾아 이벤트 POST
     */
    @Async
    public void forwardWebhookEvent(Long userId, String eventType, Map<String, Object> eventData) {
        List<Integration> webhooks = integrationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(i -> i.getType() == Integration.IntegrationType.WEBHOOK && i.isActive())
                .toList();

        for (Integration webhook : webhooks) {
            try {
                String webhookUrl = extractWebhookUrl(webhook.getConfig());
                if (webhookUrl == null) continue;

                Map<String, Object> payload = Map.of(
                        "event", eventType,
                        "timestamp", LocalDateTime.now().toString(),
                        "data", eventData
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

                restTemplate.postForEntity(webhookUrl, request, String.class);

                webhook.setLastSyncAt(LocalDateTime.now());
                integrationRepository.save(webhook);

                log.debug("Webhook 전송 성공: url={}, event={}", webhookUrl, eventType);
            } catch (Exception e) {
                log.warn("Webhook 전송 실패: integrationId={}, error={}", webhook.getId(), e.getMessage());
            }
        }
    }

    private String extractWebhookUrl(String config) {
        if (config == null) return null;
        try {
            JsonNode node = objectMapper.readTree(config);
            return node.has("url") ? node.get("url").asText() : null;
        } catch (Exception e) {
            // config가 JSON이 아닌 경우 그 자체를 URL로 사용
            return config.startsWith("http") ? config : null;
        }
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
