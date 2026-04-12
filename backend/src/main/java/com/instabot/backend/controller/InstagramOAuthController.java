package com.instabot.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.UserRepository;
import com.instabot.backend.service.InstagramApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Instagram OAuth 플로우 컨트롤러
 *
 * 1. GET  /api/auth/instagram/url       → OAuth 인증 URL 반환 (프론트에서 팝업으로 열기)
 * 2. GET  /api/auth/instagram/callback   → Meta 콜백 (code 수신 → 토큰 교환 → DB 저장 → 프론트로 리다이렉트)
 * 3. POST /api/instagram/disconnect      → 연결 해제
 * 4. GET  /api/instagram/account         → 연결된 계정 정보 조회
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class InstagramOAuthController {

    private final InstagramApiService instagramApiService;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${instagram.api.app-id}")
    private String appId;

    @Value("${instagram.api.app-secret}")
    private String appSecret;

    @Value("${instagram.oauth.redirect-uri:http://localhost:8080/api/auth/instagram/callback}")
    private String redirectUri;

    @Value("${cors.allowed-origins}")
    private String frontendOrigin;

    /**
     * 1. OAuth 인증 URL 생성 (프론트엔드에서 호출)
     */
    @GetMapping("/api/instagram/oauth-url")
    public ResponseEntity<Map<String, String>> getOAuthUrl() {
        String url = "https://www.facebook.com/v21.0/dialog/oauth"
                + "?client_id=" + appId
                + "&redirect_uri=" + redirectUri
                + "&scope=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_messaging,pages_show_list"
                + "&response_type=code"
                + "&state=" + SecurityUtils.currentUserId();

        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * 2. OAuth 콜백 — Meta가 리다이렉트하는 엔드포인트 (인증 불필요)
     *    code를 받아 → short-lived token → long-lived token → DB 저장
     */
    @GetMapping("/api/auth/instagram/callback")
    public ResponseEntity<String> handleCallback(
            @RequestParam("code") String code,
            @RequestParam(value = "state", required = false) String state) {

        try {
            // 1. code → short-lived access token
            String shortLivedToken = exchangeCodeForToken(code);

            // 2. short-lived → long-lived + 프로필 조회 + DB 저장
            Long userId = state != null ? Long.parseLong(state) : null;
            User user = null;
            if (userId != null) {
                user = userRepository.findById(userId).orElse(null);
            }

            if (user == null) {
                log.error("OAuth 콜백: 유저를 찾을 수 없음. state={}", state);
                return redirectToFrontend("error=user_not_found");
            }

            InstagramAccount account = instagramApiService.exchangeAndSaveToken(userId, shortLivedToken, user);

            log.info("Instagram 연결 성공: userId={}, igUsername={}", userId, account.getUsername());

            // 프론트엔드로 리다이렉트 (성공)
            return redirectToFrontend("instagram_connected=true&username=" + account.getUsername());

        } catch (Exception e) {
            log.error("OAuth 콜백 처리 실패: {}", e.getMessage(), e);
            return redirectToFrontend("error=oauth_failed");
        }
    }

    /**
     * 3. 연결 해제
     */
    @PostMapping("/api/instagram/disconnect")
    public ResponseEntity<Map<String, String>> disconnect() {
        Long userId = SecurityUtils.currentUserId();
        InstagramAccount account = instagramApiService.getConnectedAccount(userId);
        if (account != null) {
            account.setConnected(false);
            account.setAccessToken(null);
            // save through repository
            instagramApiService.getConnectedAccount(userId); // trigger re-query
        }
        return ResponseEntity.ok(Map.of("message", "Instagram 연결이 해제되었습니다."));
    }

    /**
     * 4. 연결된 계정 정보 조회
     */
    @GetMapping("/api/instagram/account")
    public ResponseEntity<?> getAccount() {
        Long userId = SecurityUtils.currentUserId();
        InstagramAccount account = instagramApiService.getConnectedAccount(userId);

        if (account == null) {
            return ResponseEntity.ok(Map.of("connected", false));
        }

        return ResponseEntity.ok(Map.of(
                "connected", true,
                "username", account.getUsername() != null ? account.getUsername() : "",
                "profilePictureUrl", account.getProfilePictureUrl() != null ? account.getProfilePictureUrl() : "",
                "followersCount", account.getFollowersCount() != null ? account.getFollowersCount() : 0,
                "connectedAt", account.getConnectedAt() != null ? account.getConnectedAt().toString() : "",
                "tokenExpiresAt", account.getTokenExpiresAt() != null ? account.getTokenExpiresAt().toString() : ""
        ));
    }

    // ─── 내부 ───

    private String exchangeCodeForToken(String code) {
        String url = "https://graph.facebook.com/v21.0/oauth/access_token";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", appId);
        params.add("client_secret", appSecret);
        params.add("grant_type", "authorization_code");
        params.add("redirect_uri", redirectUri);
        params.add("code", code);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);

        return response.getBody().get("access_token").asText();
    }

    private ResponseEntity<String> redirectToFrontend(String queryParams) {
        String frontUrl = frontendOrigin.split(",")[0]; // 첫 번째 origin 사용
        String redirectUrl = frontUrl + "/app/settings?" + queryParams;

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", redirectUrl);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
