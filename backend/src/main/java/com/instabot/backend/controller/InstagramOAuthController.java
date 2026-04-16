package com.instabot.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.InstagramAccountRepository;
import com.instabot.backend.repository.UserRepository;
import com.instabot.backend.service.AuthService;
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
    private final InstagramAccountRepository instagramAccountRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final RestTemplate restTemplate;

    @Value("${instagram.api.app-id}")
    private String appId;

    @Value("${instagram.api.app-secret}")
    private String appSecret;

    @Value("${instagram.oauth.redirect-uri:http://localhost:8080/api/auth/instagram/callback}")
    private String redirectUri;

    @Value("${cors.allowed-origins}")
    private String frontendOrigin;

    private static final String OAUTH_SCOPE =
            "email,public_profile,instagram_basic,instagram_manage_messages," +
            "instagram_manage_comments,pages_messaging,pages_show_list";

    /**
     * 1-a. OAuth 인증 URL 생성 — 기존 유저가 Instagram을 연결 (로그인 필요)
     */
    @GetMapping("/api/instagram/oauth-url")
    public ResponseEntity<Map<String, String>> getOAuthUrl() {
        String url = "https://www.facebook.com/v21.0/dialog/oauth"
                + "?client_id=" + appId
                + "&redirect_uri=" + redirectUri
                + "&scope=" + OAUTH_SCOPE
                + "&response_type=code"
                + "&state=connect:" + SecurityUtils.currentUserId();

        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * 1-b. OAuth 회원가입/로그인 URL 생성 (인증 불필요)
     *      Facebook에서 email/public_profile을 받아 유저 생성 또는 로그인
     */
    @GetMapping("/api/auth/instagram/signup-url")
    public ResponseEntity<Map<String, String>> getSignupUrl() {
        String url = "https://www.facebook.com/v21.0/dialog/oauth"
                + "?client_id=" + appId
                + "&redirect_uri=" + redirectUri
                + "&scope=" + OAUTH_SCOPE
                + "&response_type=code"
                + "&state=signup";

        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * 2. OAuth 콜백 — Meta가 리다이렉트하는 엔드포인트 (인증 불필요)
     *    state="connect:{userId}" : 기존 유저에 Instagram 연결
     *    state="signup"           : Facebook 프로필로 회원가입/로그인 + Instagram 연결
     */
    @GetMapping("/api/auth/instagram/callback")
    public ResponseEntity<String> handleCallback(
            @RequestParam("code") String code,
            @RequestParam(value = "state", required = false) String state) {

        try {
            String shortLivedToken = exchangeCodeForToken(code);

            // 분기: signup 플로우
            if ("signup".equals(state)) {
                return handleSignupFlow(shortLivedToken);
            }

            // 기존 플로우: state="connect:{userId}" 또는 숫자 (레거시 호환)
            Long userId = parseUserIdFromState(state);
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

            if (user == null) {
                log.error("OAuth 콜백: 유저를 찾을 수 없음. state={}", state);
                return redirectToFrontend("/app/settings", "error=user_not_found");
            }

            InstagramAccount account = instagramApiService.exchangeAndSaveToken(userId, shortLivedToken, user);
            log.info("Instagram 연결 성공: userId={}, igUsername={}", userId, account.getUsername());

            return redirectToFrontend("/app/settings",
                    "instagram_connected=true&username=" + account.getUsername());

        } catch (Exception e) {
            log.error("OAuth 콜백 처리 실패: {}", e.getMessage(), e);
            return redirectToFrontend("/login", "error=oauth_failed");
        }
    }

    /**
     * Signup/Login 플로우: Facebook 프로필 조회 → find-or-create User → JWT 발급
     */
    private ResponseEntity<String> handleSignupFlow(String shortLivedToken) {
        try {
            // 1. Facebook 프로필 조회 (id, email, name)
            JsonNode fbProfile = fetchFacebookProfile(shortLivedToken);
            String fbUserId = fbProfile.path("id").asText(null);
            String email = fbProfile.path("email").asText(null);
            String name = fbProfile.path("name").asText("사용자");

            if (fbUserId == null) {
                log.error("Signup 플로우: Facebook ID 없음. profile={}", fbProfile);
                return redirectToFrontend("/login", "error=facebook_profile_failed");
            }

            // 2. find-or-create User
            User user = userRepository.findByFacebookUserId(fbUserId)
                    .or(() -> email != null ? userRepository.findByEmail(email) : java.util.Optional.empty())
                    .orElseGet(() -> {
                        if (email == null) {
                            throw new RuntimeException("Facebook에서 이메일을 받지 못했습니다. 이메일 권한을 허용해주세요.");
                        }
                        User u = User.builder()
                                .email(email)
                                .name(name)
                                .password(null)
                                .authProvider(User.AuthProvider.FACEBOOK)
                                .facebookUserId(fbUserId)
                                .emailVerified(true) // Facebook 이메일은 검증된 것으로 간주
                                .plan(User.PlanType.FREE)
                                .build();
                        return userRepository.save(u);
                    });

            // 기존 이메일 유저가 최초로 Facebook 연동한 경우 fbUserId 저장
            if (user.getFacebookUserId() == null) {
                user.setFacebookUserId(fbUserId);
                userRepository.save(user);
            }

            // 3. Instagram 계정도 같은 플로우에서 연결
            try {
                instagramApiService.exchangeAndSaveToken(user.getId(), shortLivedToken, user);
            } catch (Exception e) {
                log.warn("Signup 후 Instagram 연결 실패 (유저 생성은 성공): userId={}, error={}",
                        user.getId(), e.getMessage());
            }

            // 4. JWT 발급 후 프론트 콜백 페이지로 리다이렉트
            String token = authService.generateToken(user);
            String params = "token=" + token
                    + "&email=" + java.net.URLEncoder.encode(user.getEmail(), java.nio.charset.StandardCharsets.UTF_8)
                    + "&name=" + java.net.URLEncoder.encode(user.getName() != null ? user.getName() : "", java.nio.charset.StandardCharsets.UTF_8);
            return redirectToFrontend("/auth/callback", params);

        } catch (Exception e) {
            log.error("Signup 플로우 실패: {}", e.getMessage(), e);
            return redirectToFrontend("/login", "error=signup_failed&reason="
                    + java.net.URLEncoder.encode(e.getMessage() != null ? e.getMessage() : "unknown",
                            java.nio.charset.StandardCharsets.UTF_8));
        }
    }

    private JsonNode fetchFacebookProfile(String accessToken) {
        String url = "https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=" + accessToken;
        ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
        return response.getBody();
    }

    private Long parseUserIdFromState(String state) {
        if (state == null) return null;
        try {
            if (state.startsWith("connect:")) {
                return Long.parseLong(state.substring("connect:".length()));
            }
            return Long.parseLong(state); // 레거시 호환
        } catch (NumberFormatException e) {
            return null;
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
            account.setTokenExpiresAt(null);
            instagramAccountRepository.save(account);
            log.info("Instagram 연결 해제: userId={}, username={}", userId, account.getUsername());
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

    private ResponseEntity<String> redirectToFrontend(String path, String queryParams) {
        String frontUrl = frontendOrigin.split(",")[0];
        String redirectUrl = frontUrl + path + (queryParams != null && !queryParams.isEmpty() ? "?" + queryParams : "");

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", redirectUrl);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
