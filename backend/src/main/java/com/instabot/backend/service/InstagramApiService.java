package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.repository.InstagramAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Instagram Graph API 연동 서비스
 * - OAuth 토큰 교환
 * - DM 발송 (텍스트, 버튼, 링크)
 * - 댓글 답장
 * - 팔로우 상태 조회
 * - 토큰 자동 갱신
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InstagramApiService {

    private final InstagramAccountRepository instagramAccountRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${instagram.api.base-url}")
    private String apiBaseUrl;

    @Value("${instagram.api.app-id}")
    private String appId;

    @Value("${instagram.api.app-secret}")
    private String appSecret;

    // ─── OAuth ───

    /**
     * Short-lived token → Long-lived token 교환 후 계정 저장
     */
    public InstagramAccount exchangeAndSaveToken(Long userId, String shortLivedToken,
                                                  com.instabot.backend.entity.User user) {
        // 1. Long-lived token 교환
        String longLivedToken = exchangeLongLivedToken(shortLivedToken);

        // 2. 프로필 정보 조회
        JsonNode profile = getProfile(longLivedToken);
        String igUserId = profile.get("id").asText();
        String username = profile.has("username") ? profile.get("username").asText() : "";

        // 3. 기존 계정 있으면 업데이트, 없으면 생성
        InstagramAccount account = instagramAccountRepository.findByIgUserId(igUserId)
                .orElse(InstagramAccount.builder()
                        .user(user)
                        .igUserId(igUserId)
                        .build());

        account.setUsername(username);
        account.setAccessToken(longLivedToken);
        account.setConnected(true);
        account.setConnectedAt(LocalDateTime.now());
        account.setTokenExpiresAt(LocalDateTime.now().plusDays(60));

        if (profile.has("profile_picture_url")) {
            account.setProfilePictureUrl(profile.get("profile_picture_url").asText());
        }
        if (profile.has("followers_count")) {
            account.setFollowersCount(profile.get("followers_count").asLong());
        }

        return instagramAccountRepository.save(account);
    }

    private String exchangeLongLivedToken(String shortLivedToken) {
        String url = "https://graph.facebook.com/v21.0/oauth/access_token"
                + "?grant_type=fb_exchange_token"
                + "&client_id=" + appId
                + "&client_secret=" + appSecret
                + "&fb_exchange_token=" + shortLivedToken;

        ResponseEntity<JsonNode> resp = restTemplate.getForEntity(url, JsonNode.class);
        return resp.getBody().get("access_token").asText();
    }

    private JsonNode getProfile(String accessToken) {
        String url = apiBaseUrl + "/v21.0/me?fields=id,username,profile_picture_url,followers_count&access_token=" + accessToken;
        return restTemplate.getForObject(url, JsonNode.class);
    }

    // ─── DM 발송 ───

    /**
     * 텍스트 DM 발송
     */
    public JsonNode sendTextMessage(String igUserId, String recipientId, String text, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = Map.of(
                "recipient", Map.of("id", recipientId),
                "message", Map.of("text", text)
        );

        return postToInstagram(url, body, accessToken);
    }

    /**
     * Quick Reply (버튼) DM 발송
     */
    public JsonNode sendQuickReplyMessage(String igUserId, String recipientId, String text,
                                           List<Map<String, String>> quickReplies, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = Map.of(
                "recipient", Map.of("id", recipientId),
                "message", Map.of(
                        "text", text,
                        "quick_replies", quickReplies.stream()
                                .map(qr -> Map.of(
                                        "content_type", "text",
                                        "title", qr.get("title"),
                                        "payload", qr.getOrDefault("payload", qr.get("title"))
                                ))
                                .toList()
                )
        );

        return postToInstagram(url, body, accessToken);
    }

    /**
     * Generic Template (링크 버튼 포함) DM 발송
     */
    public JsonNode sendGenericTemplate(String igUserId, String recipientId, String title,
                                         String subtitle, List<Map<String, String>> buttons, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = Map.of(
                "recipient", Map.of("id", recipientId),
                "message", Map.of(
                        "attachment", Map.of(
                                "type", "template",
                                "payload", Map.of(
                                        "template_type", "generic",
                                        "elements", List.of(Map.of(
                                                "title", title,
                                                "subtitle", subtitle != null ? subtitle : "",
                                                "buttons", buttons.stream()
                                                        .map(b -> Map.of(
                                                                "type", "web_url",
                                                                "url", b.get("url"),
                                                                "title", b.get("title")
                                                        ))
                                                        .toList()
                                        ))
                                )
                        )
                )
        );

        return postToInstagram(url, body, accessToken);
    }

    // ─── 댓글 답장 ───

    /**
     * 댓글에 자동 답장
     */
    public JsonNode replyToComment(String commentId, String message, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + commentId + "/replies";

        Map<String, Object> body = Map.of("message", message);
        return postToInstagram(url, body, accessToken);
    }

    // ─── 팔로우 확인 ───

    /**
     * 사용자가 해당 IG 계정을 팔로우하는지 확인
     * (Instagram API 제한: 비즈니스 계정의 팔로워 목록에서 확인)
     */
    public boolean isFollower(String igUserId, String checkUserId, String accessToken) {
        try {
            String url = apiBaseUrl + "/v21.0/" + igUserId
                    + "?fields=business_discovery.fields(followers_count)&access_token=" + accessToken;
            // Instagram API는 특정 사용자의 팔로우 여부를 직접 확인하는 엔드포인트가 없음
            // 실제 구현에서는 Webhook 이벤트로 팔로우 상태를 추적하거나
            // 사용자에게 팔로우 요청 후 재확인하는 방식 사용
            log.info("팔로우 확인 요청: igUserId={}, checkUserId={}", igUserId, checkUserId);
            return false; // 기본적으로 미팔로우로 처리, Webhook으로 업데이트
        } catch (Exception e) {
            log.error("팔로우 확인 실패: {}", e.getMessage());
            return false;
        }
    }

    // ─── Ice Breaker / Welcome Message ───

    public JsonNode setIceBreakers(String igUserId, List<Map<String, String>> iceBreakers, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messenger_profile";

        Map<String, Object> body = Map.of(
                "ice_breakers", iceBreakers.stream()
                        .map(ib -> Map.of(
                                "question", ib.get("question"),
                                "payload", ib.getOrDefault("payload", ib.get("question"))
                        ))
                        .toList()
        );

        return postToInstagram(url, body, accessToken);
    }

    // ─── 토큰 갱신 ───

    /**
     * 만료 7일 전 토큰 자동 갱신 (매일 03:00 실행)
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void refreshExpiringTokens() {
        LocalDateTime threshold = LocalDateTime.now().plusDays(7);
        List<InstagramAccount> expiringAccounts = instagramAccountRepository.findAll().stream()
                .filter(a -> a.isConnected() && a.getTokenExpiresAt() != null
                        && a.getTokenExpiresAt().isBefore(threshold))
                .toList();

        for (InstagramAccount account : expiringAccounts) {
            try {
                String url = apiBaseUrl + "/v21.0/oauth/access_token"
                        + "?grant_type=ig_refresh_token"
                        + "&access_token=" + account.getAccessToken();

                ResponseEntity<JsonNode> resp = restTemplate.getForEntity(url, JsonNode.class);
                String newToken = resp.getBody().get("access_token").asText();

                account.setAccessToken(newToken);
                account.setTokenExpiresAt(LocalDateTime.now().plusDays(60));
                instagramAccountRepository.save(account);

                log.info("토큰 갱신 완료: igUserId={}", account.getIgUserId());
            } catch (Exception e) {
                log.error("토큰 갱신 실패: igUserId={}, error={}", account.getIgUserId(), e.getMessage());
            }
        }
    }

    // ─── 내부 유틸 ───

    private JsonNode postToInstagram(String url, Map<String, Object> body, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            log.debug("Instagram API 응답: {}", response.getBody());
            return response.getBody();
        } catch (Exception e) {
            log.error("Instagram API 호출 실패: url={}, error={}", url, e.getMessage());
            throw new RuntimeException("Instagram API 호출에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 사용자의 연결된 Instagram 계정 조회
     */
    public InstagramAccount getConnectedAccount(Long userId) {
        return instagramAccountRepository.findByUserId(userId).stream()
                .filter(InstagramAccount::isConnected)
                .findFirst()
                .orElse(null);
    }
}
