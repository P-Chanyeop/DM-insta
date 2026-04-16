package com.instabot.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.config.EncryptionUtil;
import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.TeamMember;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.InstagramAccountRepository;
import com.instabot.backend.repository.TeamMemberRepository;
import com.instabot.backend.repository.UserRepository;
import com.instabot.backend.service.AuthService;
import com.instabot.backend.service.InstagramApiService;
import com.instabot.backend.service.InstagramApiService.IgConnectionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Instagram OAuth 플로우 컨트롤러
 *
 * 1. GET  /api/auth/instagram/signup-url       → 회원가입/로그인용 OAuth URL (인증 불필요)
 * 2. GET  /api/instagram/oauth-url             → 기존 유저 IG 연결 OAuth URL (인증 필요)
 * 3. GET  /api/auth/instagram/callback         → Meta OAuth 콜백 (통합)
 * 4. POST /api/instagram/retry-connect         → 저장된 FB 토큰으로 IG 연결 재시도 (OAuth 스킵)
 * 5. POST /api/instagram/disconnect            → 연결 해제
 * 6. GET  /api/instagram/account               → 연결된 계정 정보 조회
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class InstagramOAuthController {

    private final InstagramApiService instagramApiService;
    private final InstagramAccountRepository instagramAccountRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AuthService authService;
    private final EncryptionUtil encryptionUtil;
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
            "instagram_manage_comments,pages_messaging,pages_show_list,business_management";

    // ─── OAuth URL 생성 ───

    /** 기존 유저가 IG 연결할 때 쓰는 URL (인증 필요) */
    @GetMapping("/api/instagram/oauth-url")
    public ResponseEntity<Map<String, String>> getOAuthUrl() {
        String url = buildOAuthUrl("connect:" + SecurityUtils.currentUserId());
        return ResponseEntity.ok(Map.of("url", url));
    }

    /** 회원가입/로그인용 URL (인증 불필요) */
    @GetMapping("/api/auth/instagram/signup-url")
    public ResponseEntity<Map<String, String>> getSignupUrl() {
        return ResponseEntity.ok(Map.of("url", buildOAuthUrl("signup")));
    }

    private String buildOAuthUrl(String state) {
        return "https://www.facebook.com/v21.0/dialog/oauth"
                + "?client_id=" + appId
                + "&redirect_uri=" + urlEncode(redirectUri)
                + "&scope=" + OAUTH_SCOPE
                + "&response_type=code"
                + "&state=" + state;
    }

    // ─── OAuth 콜백 (통합) ───

    /**
     * Meta OAuth 콜백.
     *  state="signup"           → 회원가입/로그인 + IG 연결 시도
     *  state="connect:{userId}" → 기존 유저에 IG 연결
     *
     * 실패 리다이렉트는 모두 /app/onboarding?ig_error=... 로 통일.
     * (팝업을 안 쓰고 full-page redirect 기준. 팝업을 쓴 경우엔 팝업 안에서 URL 이동되므로
     *  프론트에서 postMessage로 닫아주면 됨)
     */
    @GetMapping("/api/auth/instagram/callback")
    public ResponseEntity<String> handleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String oauthError,
            @RequestParam(value = "error_reason", required = false) String oauthErrorReason) {

        // Meta가 사용자 취소 등으로 error 파라미터를 돌려준 경우
        if (code == null || (oauthError != null && !oauthError.isBlank())) {
            log.warn("OAuth 콜백에서 Meta 에러: error={}, reason={}", oauthError, oauthErrorReason);
            String reason = oauthErrorReason != null ? oauthErrorReason : (oauthError != null ? oauthError : "no_code");
            return redirectAfterOAuth(state, null, "ig_error=oauth_cancelled&reason=" + urlEncode(reason));
        }

        try {
            String shortLivedToken = exchangeCodeForToken(code);

            if ("signup".equals(state)) {
                return handleSignupFlow(shortLivedToken);
            }

            Long userId = parseUserIdFromState(state);
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            if (user == null) {
                log.error("OAuth 콜백: 유저를 찾을 수 없음. state={}", state);
                return redirectAfterOAuth(state, null, "ig_error=user_not_found");
            }
            return handleConnectFlow(user, shortLivedToken);

        } catch (Exception e) {
            log.error("OAuth 콜백 처리 실패: {}", e.getMessage(), e);
            return redirectAfterOAuth(state, null, "ig_error=oauth_failed&reason=" + urlEncode(e.getMessage()));
        }
    }

    /** 회원가입/로그인 플로우 — User 생성/조회 + FB 토큰 저장 + IG 연결 시도 */
    private ResponseEntity<String> handleSignupFlow(String shortLivedToken) {
        // 1. 장기 FB 토큰 교환
        String longLivedToken;
        try {
            longLivedToken = instagramApiService.exchangeLongLivedToken(shortLivedToken);
        } catch (Exception e) {
            log.error("장기 토큰 교환 실패: {}", e.getMessage());
            return redirectToFrontend("/login", "error=fb_token_exchange_failed");
        }

        // 2. Facebook 프로필 조회 (id, email, name)
        JsonNode fbProfile;
        try {
            fbProfile = fetchFacebookProfile(longLivedToken);
        } catch (Exception e) {
            log.error("Facebook 프로필 조회 실패: {}", e.getMessage());
            return redirectToFrontend("/login", "error=fb_profile_failed");
        }

        String fbUserId = fbProfile.path("id").asText(null);
        String email = fbProfile.path("email").asText(null);
        String name = fbProfile.path("name").asText("사용자");

        if (fbUserId == null) {
            return redirectToFrontend("/login", "error=facebook_profile_failed");
        }
        if (email == null) {
            return redirectToFrontend("/login",
                    "error=no_email&reason=" + urlEncode("Facebook에서 이메일을 받지 못했습니다. 이메일 권한을 허용해주세요."));
        }

        // 3. find-or-create User
        final boolean[] isNewUser = { false };
        final String fbIdFinal = fbUserId;
        final String emailFinal = email;
        final String nameFinal = name;

        User user = userRepository.findByFacebookUserId(fbIdFinal)
                .or(() -> userRepository.findByEmail(emailFinal))
                .orElseGet(() -> {
                    User u = User.builder()
                            .email(emailFinal)
                            .name(nameFinal)
                            .password(null)
                            .authProvider(User.AuthProvider.FACEBOOK)
                            .facebookUserId(fbIdFinal)
                            .emailVerified(true)
                            .plan(User.PlanType.FREE)
                            .build();
                    User saved = userRepository.save(u);
                    isNewUser[0] = true;
                    return saved;
                });

        // 4. 신규 OAuth 유저면 OWNER TeamMember 생성
        if (isNewUser[0]) {
            teamMemberRepository.save(TeamMember.builder()
                    .teamOwnerId(user.getId())
                    .userId(user.getId())
                    .role(TeamMember.Role.OWNER)
                    .joinedAt(LocalDateTime.now())
                    .build());
            log.info("OAuth 신규 가입: userId={}, email={}", user.getId(), user.getEmail());
        }

        // 5. FB 토큰 저장 (암호화) + fbUserId 갱신
        user.setFacebookUserId(fbIdFinal);
        user.setFacebookAccessToken(encryptionUtil.encrypt(longLivedToken));
        user.setFacebookTokenExpiresAt(LocalDateTime.now().plusDays(60));
        userRepository.save(user);

        // 6. IG 연결 시도 (실패해도 유저 생성은 완료된 상태 — 온보딩에서 재시도 가능)
        String igStatus = "none";
        String igErrorCode = null;
        String igErrorMsg = null;
        try {
            InstagramAccount acc = instagramApiService.connectInstagramViaFacebook(user, longLivedToken);
            igStatus = "connected";
            log.info("Signup + IG 연결 성공: userId={}, igUsername={}", user.getId(), acc.getUsername());
        } catch (IgConnectionException e) {
            igErrorCode = e.getCode();
            igErrorMsg = e.getMessage();
            log.warn("Signup 후 IG 연결 실패 (유저는 생성됨): userId={}, code={}, msg={}",
                    user.getId(), igErrorCode, igErrorMsg);
        } catch (Exception e) {
            igErrorCode = "UNKNOWN";
            igErrorMsg = e.getMessage();
            log.warn("Signup 후 IG 연결 실패 (유저는 생성됨): userId={}, error={}", user.getId(), e.getMessage());
        }

        // 7. JWT 발급 후 프론트 콜백 페이지로 리다이렉트
        String token = authService.generateToken(user);
        StringBuilder params = new StringBuilder()
                .append("token=").append(token)
                .append("&email=").append(urlEncode(user.getEmail()))
                .append("&name=").append(urlEncode(user.getName() != null ? user.getName() : ""))
                .append("&ig_status=").append(igStatus);
        if (igErrorCode != null) {
            params.append("&ig_error=").append(urlEncode(igErrorCode))
                  .append("&ig_reason=").append(urlEncode(igErrorMsg != null ? igErrorMsg : ""));
        }
        return redirectToFrontend("/auth/callback", params.toString());
    }

    /** 기존 유저 IG 연결 플로우 */
    private ResponseEntity<String> handleConnectFlow(User user, String shortLivedToken) {
        // 장기 토큰 교환 + 저장
        String longLivedToken;
        try {
            longLivedToken = instagramApiService.exchangeLongLivedToken(shortLivedToken);
        } catch (Exception e) {
            log.error("장기 토큰 교환 실패: userId={}, error={}", user.getId(), e.getMessage());
            return redirectToFrontend("/app/onboarding", "ig_error=fb_token_exchange_failed");
        }

        user.setFacebookAccessToken(encryptionUtil.encrypt(longLivedToken));
        user.setFacebookTokenExpiresAt(LocalDateTime.now().plusDays(60));
        userRepository.save(user);

        try {
            InstagramAccount acc = instagramApiService.connectInstagramViaFacebook(user, longLivedToken);
            log.info("IG 연결 성공: userId={}, igUsername={}", user.getId(), acc.getUsername());
            return redirectToFrontend("/app/onboarding",
                    "ig_connected=true&username=" + urlEncode(acc.getUsername()));
        } catch (IgConnectionException e) {
            log.warn("IG 연결 실패: userId={}, code={}, msg={}", user.getId(), e.getCode(), e.getMessage());
            return redirectToFrontend("/app/onboarding",
                    "ig_error=" + urlEncode(e.getCode()) + "&ig_reason=" + urlEncode(e.getMessage()));
        } catch (Exception e) {
            log.error("IG 연결 중 예외: userId={}, error={}", user.getId(), e.getMessage(), e);
            return redirectToFrontend("/app/onboarding",
                    "ig_error=UNKNOWN&ig_reason=" + urlEncode(e.getMessage()));
        }
    }

    // ─── 재시도 (저장된 FB 토큰 사용, OAuth 스킵) ───

    /**
     * 저장된 FB 토큰으로 IG 연결 재시도.
     * OAuth 팝업/리다이렉트 없이 유저가 FB 페이지/IG 비즈니스 계정을 세팅 완료한 후
     * "재시도" 버튼만 누르면 바로 연결 시도.
     */
    @PostMapping("/api/instagram/retry-connect")
    public ResponseEntity<Map<String, Object>> retryConnect() {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            // JWT는 유효하지만 DB에 유저가 없음 (ex: DB 리셋 후) → 재로그인 유도
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "SESSION_EXPIRED",
                    "message", "세션이 만료되었습니다. 다시 로그인해주세요."
            ));
        }

        String encryptedToken = user.getFacebookAccessToken();
        if (encryptedToken == null || user.getFacebookTokenExpiresAt() == null
                || user.getFacebookTokenExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "FB_TOKEN_MISSING",
                    "message", "Facebook 인증이 필요합니다. Instagram 연결하기를 다시 눌러주세요."
            ));
        }

        String fbToken;
        try {
            fbToken = encryptionUtil.decrypt(encryptedToken);
        } catch (Exception e) {
            log.error("FB 토큰 복호화 실패: userId={}", userId);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "FB_TOKEN_INVALID",
                    "message", "저장된 Facebook 토큰이 유효하지 않습니다. 다시 로그인해주세요."
            ));
        }

        try {
            InstagramAccount acc = instagramApiService.connectInstagramViaFacebook(user, fbToken);
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("username", acc.getUsername());
            ok.put("profilePictureUrl", acc.getProfilePictureUrl() != null ? acc.getProfilePictureUrl() : "");
            ok.put("followersCount", acc.getFollowersCount() != null ? acc.getFollowersCount() : 0);
            return ResponseEntity.ok(ok);
        } catch (IgConnectionException e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getCode(),
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("IG 재연결 실패: userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "UNKNOWN",
                    "message", e.getMessage() != null ? e.getMessage() : "연결에 실패했습니다."
            ));
        }
    }

    // ─── 기타 ───

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

    @GetMapping("/api/instagram/account")
    public ResponseEntity<?> getAccount() {
        Long userId = SecurityUtils.currentUserId();
        InstagramAccount account = instagramApiService.getConnectedAccount(userId);

        if (account == null) {
            return ResponseEntity.ok(Map.of("connected", false));
        }

        Map<String, Object> body = new HashMap<>();
        body.put("connected", true);
        body.put("username", account.getUsername() != null ? account.getUsername() : "");
        body.put("profilePictureUrl", account.getProfilePictureUrl() != null ? account.getProfilePictureUrl() : "");
        body.put("followersCount", account.getFollowersCount() != null ? account.getFollowersCount() : 0);
        body.put("connectedAt", account.getConnectedAt() != null ? account.getConnectedAt().toString() : "");
        body.put("tokenExpiresAt", account.getTokenExpiresAt() != null ? account.getTokenExpiresAt().toString() : "");
        return ResponseEntity.ok(body);
    }

    // ─── 내부 헬퍼 ───

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

    private JsonNode fetchFacebookProfile(String accessToken) {
        String url = "https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=" + accessToken;
        return restTemplate.getForObject(url, JsonNode.class);
    }

    private Long parseUserIdFromState(String state) {
        if (state == null) return null;
        try {
            if (state.startsWith("connect:")) {
                return Long.parseLong(state.substring("connect:".length()));
            }
            return Long.parseLong(state);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private ResponseEntity<String> redirectToFrontend(String path, String queryParams) {
        String frontUrl = frontendOrigin.split(",")[0];
        String redirectUrl = frontUrl + path + (queryParams != null && !queryParams.isEmpty() ? "?" + queryParams : "");

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", redirectUrl);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    /**
     * state 값에 따라 적절한 프론트 경로로 리다이렉트:
     *  - "signup" → /login (에러만 가능: 성공 시는 handleSignupFlow가 /auth/callback으로)
     *  - "connect:xxx" → /app/onboarding
     */
    private ResponseEntity<String> redirectAfterOAuth(String state, String successPath, String queryParams) {
        String path;
        if (state != null && state.startsWith("connect:")) {
            path = "/app/onboarding";
        } else {
            path = "/login";
        }
        if (successPath != null) path = successPath;
        return redirectToFrontend(path, queryParams);
    }

    private String urlEncode(String s) {
        return s == null ? "" : URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
