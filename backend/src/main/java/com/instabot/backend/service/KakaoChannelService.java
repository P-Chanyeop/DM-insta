package com.instabot.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.KakaoChannelDto.*;
import com.instabot.backend.entity.Integration;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.repository.IntegrationRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class KakaoChannelService {

    private final IntegrationRepository integrationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    private static final String KAKAO_BIZ_API_URL = "https://api.bizppurio.com/v1";

    @Transactional
    public ChannelResponse connectChannel(Long userId, ConnectRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("사용자를 찾을 수 없습니다"));

        // 기존 카카오 채널 연동 확인
        integrationRepository.findByUserIdAndType(userId, Integration.IntegrationType.KAKAO_CHANNEL)
                .ifPresent(existing -> {
                    throw new BadRequestException("이미 카카오 채널이 연결되어 있습니다. 기존 연결을 해제 후 다시 시도하세요.");
                });

        // API 키 검증 — 비즈뿌리오 토큰 발급 시도
        validateApiCredentials(req.getApiKey(), req.getSenderKey());

        Map<String, String> config = new HashMap<>();
        config.put("channelId", req.getChannelId());
        config.put("searchId", req.getSearchId());
        config.put("senderKey", req.getSenderKey());
        config.put("apiKey", req.getApiKey());
        config.put("channelName", req.getChannelName());
        config.put("profileImageUrl", req.getProfileImageUrl());

        try {
            Integration integration = Integration.builder()
                    .user(user)
                    .type(Integration.IntegrationType.KAKAO_CHANNEL)
                    .name(req.getChannelName() != null ? req.getChannelName() : "카카오 채널")
                    .config(objectMapper.writeValueAsString(config))
                    .active(true)
                    .build();

            integration = integrationRepository.save(integration);
            return toResponse(integration, config);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("카카오 채널 연결 실패: " + e.getMessage());
        }
    }

    /**
     * 비즈뿌리오 API 키 검증 — 토큰 발급 시도로 자격 증명 유효성 확인
     */
    private void validateApiCredentials(String apiKey, String senderKey) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // 발신프로필 조회 API로 senderKey 유효성 검증
            String url = KAKAO_BIZ_API_URL + "/sender/key/" + senderKey;
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BadRequestException("API 키 또는 발신프로필 키가 유효하지 않습니다. 비즈뿌리오 설정을 확인해주세요.");
            }

            log.info("카카오 채널 API 검증 성공: senderKey={}", senderKey);
        } catch (BadRequestException e) {
            throw e;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            HttpStatusCode status = e.getStatusCode();
            if (status.value() == 401 || status.value() == 403) {
                throw new BadRequestException("API 키가 유효하지 않습니다. 비즈뿌리오에서 발급받은 올바른 API 키를 입력해주세요.");
            } else if (status.value() == 404) {
                throw new BadRequestException("발신프로필 키(Sender Key)가 유효하지 않습니다. 비즈뿌리오에서 등록된 발신프로필을 확인해주세요.");
            } else {
                throw new BadRequestException("카카오 채널 검증 실패 (HTTP " + status.value() + "). 입력 정보를 다시 확인해주세요.");
            }
        } catch (org.springframework.web.client.ResourceAccessException e) {
            throw new BadRequestException("비즈뿌리오 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        } catch (Exception e) {
            log.error("카카오 채널 검증 중 예외: {}", e.getMessage());
            throw new BadRequestException("카카오 채널 연결 검증에 실패했습니다: " + e.getMessage());
        }
    }

    public Optional<ChannelResponse> getChannel(Long userId) {
        return integrationRepository.findByUserIdAndType(userId, Integration.IntegrationType.KAKAO_CHANNEL)
                .map(integration -> {
                    try {
                        Map<String, String> config = objectMapper.readValue(
                                integration.getConfig(), new TypeReference<>() {});
                        return toResponse(integration, config);
                    } catch (Exception e) {
                        return null;
                    }
                });
    }

    @Transactional
    public void disconnectChannel(Long userId) {
        Integration integration = integrationRepository
                .findByUserIdAndType(userId, Integration.IntegrationType.KAKAO_CHANNEL)
                .orElseThrow(() -> new RuntimeException("연결된 카카오 채널이 없습니다"));
        integrationRepository.delete(integration);
    }

    /**
     * 알림톡 발송
     */
    public SendResult sendAlimtalk(Long userId, String templateCode, String recipientPhone, Map<String, String> variables) {
        Map<String, String> config = getKakaoConfig(userId);

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("senderKey", config.get("senderKey"));
            body.put("templateCode", templateCode);
            body.put("recipientNo", recipientPhone);

            // 템플릿 변수 치환
            if (variables != null && !variables.isEmpty()) {
                body.put("templateParameter", variables);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + config.get("apiKey"));

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    KAKAO_BIZ_API_URL + "/message/alimtalk",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    JsonNode.class
            );

            JsonNode result = response.getBody();
            log.info("알림톡 발송: phone={}, template={}, status={}", recipientPhone, templateCode, response.getStatusCode());

            return SendResult.builder()
                    .success(response.getStatusCode().is2xxSuccessful())
                    .messageId(result != null ? result.path("messageId").asText(null) : null)
                    .build();
        } catch (Exception e) {
            log.error("알림톡 발송 실패: {}", e.getMessage());
            return SendResult.builder()
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * 친구톡 발송
     */
    public SendResult sendFriendtalk(Long userId, String recipientPhone, String message, String imageUrl) {
        Map<String, String> config = getKakaoConfig(userId);

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("senderKey", config.get("senderKey"));
            body.put("recipientNo", recipientPhone);
            body.put("content", Map.of("message", message));
            if (imageUrl != null) {
                body.put("image", Map.of("imageUrl", imageUrl));
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + config.get("apiKey"));

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    KAKAO_BIZ_API_URL + "/message/friendtalk",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    JsonNode.class
            );

            JsonNode result = response.getBody();
            log.info("친구톡 발송: phone={}, status={}", recipientPhone, response.getStatusCode());

            return SendResult.builder()
                    .success(response.getStatusCode().is2xxSuccessful())
                    .messageId(result != null ? result.path("messageId").asText(null) : null)
                    .build();
        } catch (Exception e) {
            log.error("친구톡 발송 실패: {}", e.getMessage());
            return SendResult.builder()
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private Map<String, String> getKakaoConfig(Long userId) {
        Integration integration = integrationRepository
                .findByUserIdAndType(userId, Integration.IntegrationType.KAKAO_CHANNEL)
                .orElseThrow(() -> new BadRequestException("카카오 채널이 연결되어 있지 않습니다"));

        if (!integration.isActive()) {
            throw new BadRequestException("카카오 채널 연동이 비활성화되어 있습니다");
        }

        try {
            return objectMapper.readValue(integration.getConfig(), new TypeReference<>() {});
        } catch (Exception e) {
            throw new BadRequestException("카카오 설정을 읽을 수 없습니다");
        }
    }

    private ChannelResponse toResponse(Integration integration, Map<String, String> config) {
        return ChannelResponse.builder()
                .integrationId(integration.getId())
                .channelId(config.get("channelId"))
                .searchId(config.get("searchId"))
                .channelName(config.get("channelName"))
                .profileImageUrl(config.get("profileImageUrl"))
                .active(integration.isActive())
                .connectedAt(integration.getCreatedAt())
                .build();
    }
}
