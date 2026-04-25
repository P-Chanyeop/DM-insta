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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Instagram OAuth 플로우 컨트롤러 (Instagram Login 방식)
 *
 * 1. GET  /api/auth/instagram/signup-url       → 회원가입/로그인용 OAuth URL (인증 불필요)
 * 2. GET  /api/instagram/oauth-url             → 기존 유저 IG 연결 OAuth URL (인증 필요)
 * 3. GET  /api/auth/instagram/callback         → Instagram OAuth 콜백 (통합)
 * 4. POST /api/instagram/retry-connect         → 저장된 IG 토큰으로 IG 연결 재시도
 * 5. POST /api/instagram/disconnect            → 연결 해제
 * 6. GET  /api/instagram/account               → 연결된 계정 정보 조회
 */
@Slf4j
@RestController
public class InstagramOAuthController {

    private final InstagramApiService instagramApiService;
    private final InstagramAccountRepository instagramAccountRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AuthService authService;
    private final EncryptionUtil encryptionUtil;
    private final RestTemplate restTemplate;
    private final JdbcTemplate jdbcTemplate;

    public InstagramOAuthController(
            InstagramApiService instagramApiService,
            InstagramAccountRepository instagramAccountRepository,
            UserRepository userRepository,
            TeamMemberRepository teamMemberRepository,
            AuthService authService,
            EncryptionUtil encryptionUtil,
            RestTemplate restTemplate,
            JdbcTemplate jdbcTemplate) {
        this.instagramApiService = instagramApiService;
        this.instagramAccountRepository = instagramAccountRepository;
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.authService = authService;
        this.encryptionUtil = encryptionUtil;
        this.restTemplate = restTemplate;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Value("${instagram.api.app-id}")
    private String appId;

    @Value("${instagram.api.app-secret}")
    private String appSecret;

    @Value("${instagram.oauth.config-id}")
    private String configId;

    @Value("${instagram.oauth.redirect-uri:http://localhost:8080/api/auth/instagram/callback}")
    private String redirectUri;

    @Value("${cors.allowed-origins}")
    private String frontendOrigin;

    // Facebook Login for Business 패턴 — 권한은 Meta App Dashboard 의 Configuration 에서
    // 정의되며 OAuth URL 에는 scope 를 명시하지 않는다. config_id 가 권한 set 의 ID 역할.

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

    /**
     * Facebook Login for Business 의 OAuth URL 빌더 — 매니챗과 동일한 패턴.
     * <p>
     * 사용자 흐름:
     *   1. {@code business.facebook.com/dialog/oauth} 로 redirect
     *   2. Instagram 로그인 (또는 이미 로그인된 IG 계정 선택)
     *   3. Meta Business Manager 의 권한 grant 화면 — 비즈니스 포트폴리오 + IG 자산 선택
     *   4. 권한 확인 후 우리 콜백으로 redirect (?code=...)
     * <p>
     * scope 파라미터 없음 — 모든 권한은 config_id 의 Configuration 에 정의됨
     * (Meta App Dashboard → Facebook Login for Business → Configurations).
     *
     * @param state OAuth state 파라미터 ("signup" 또는 "connect:{userId}")
     * @return 사용자가 redirect 받을 OAuth dialog URL
     */
    private String buildOAuthUrl(String state) {
        // auth_type=reauthorize — 매번 권한 grant 화면을 거치게 해서 사용자가 IG 자산
        // (어떤 IG 계정 연결할지) 을 명시적으로 선택할 수 있게 한다. 이게 빠지면 사용자가
        // 이미 grant 한 경우 dialog 자체가 skip 되어 첫 번째 IG 자산이 자동 연결됨.
        // 매니챗과 동일한 자산 선택 UX 위해 필요.
        return "https://business.facebook.com/dialog/oauth"
                + "?client_id=" + appId
                + "&config_id=" + configId
                + "&redirect_uri=" + urlEncode(redirectUri)
                + "&response_type=code"
                + "&override_default_response_type=true"
                + "&auth_type=reauthorize"
                + "&state=" + state;
    }

    // ─── OAuth 콜백 (통합) ───

    /**
     * Instagram OAuth 콜백.
     *  state="signup"           → 회원가입/로그인 + IG 연결
     *  state="connect:{userId}" → 기존 유저에 IG 연결
     */
    @GetMapping("/api/auth/instagram/callback")
    public ResponseEntity<String> handleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String oauthError,
            @RequestParam(value = "error_reason", required = false) String oauthErrorReason) {

        // 사용자 취소 등으로 error 파라미터가 있는 경우
        if (code == null || (oauthError != null && !oauthError.isBlank())) {
            log.warn("OAuth 콜백에서 Instagram 에러: error={}, reason={}", oauthError, oauthErrorReason);
            String reason = oauthErrorReason != null ? oauthErrorReason : (oauthError != null ? oauthError : "no_code");
            return redirectAfterOAuth(state, null, "ig_error=oauth_cancelled&reason=" + urlEncode(reason));
        }

        try {
            // Facebook OAuth 코드 → 단기 User Token 교환.
            // Facebook Login for Business 의 응답은 {"access_token", "token_type", "expires_in"} 만 포함.
            // user_id 필드 없음 — IG account ID 는 후속 fetchInstagramProfile (/me/accounts) 에서 추출.
            JsonNode tokenResponse = exchangeCodeForToken(code);
            String shortLivedToken = tokenResponse.get("access_token").asText();

            if ("signup".equals(state)) {
                return handleSignupFlow(shortLivedToken, null);
            }

            Long userId = parseUserIdFromState(state);
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            if (user == null) {
                log.error("OAuth 콜백: 유저를 찾을 수 없음. state={}", state);
                return redirectAfterOAuth(state, null, "ig_error=user_not_found");
            }
            return handleConnectFlow(user, shortLivedToken, null);

        } catch (Exception e) {
            log.error("OAuth 콜백 처리 실패: {}", e.getMessage(), e);
            return redirectAfterOAuth(state, null, "ig_error=oauth_failed&reason=" + urlEncode(e.getMessage()));
        }
    }

    /**
     * 회원가입/로그인 플로우.
     *
     *   1) 장기 토큰 교환 + 프로필 조회.
     *   2) IGSID 로 기존 유저 조회:
     *      - 존재 → 정상 로그인 (JWT 발급 + IG 재연결).
     *      - 없음 → pending-signup 토큰만 발급해 /onboarding/email 로 리다이렉트.
     *        유저 생성은 이메일 입력 스텝에서 POST /auth/complete-ig-signup 이 수행.
     */
    private ResponseEntity<String> handleSignupFlow(String shortLivedToken, String igUserId) {
        // 1. 장기 토큰 교환
        String longLivedToken;
        try {
            longLivedToken = instagramApiService.exchangeLongLivedToken(shortLivedToken);
        } catch (Exception e) {
            log.error("장기 토큰 교환 실패: {}", e.getMessage());
            return redirectToFrontend("/login", "error=ig_token_exchange_failed");
        }

        // 2. Instagram 프로필 조회
        JsonNode igProfile;
        try {
            igProfile = fetchInstagramProfile(longLivedToken);
        } catch (Exception e) {
            log.error("Instagram 프로필 조회 실패: {}", e.getMessage());
            return redirectToFrontend("/login", "error=ig_profile_failed");
        }

        String username = igProfile.path("username").asText("");
        String name = igProfile.path("name").asText(username);
        String igId = igProfile.path("user_id").asText(igUserId);
        if (igId == null || igId.isEmpty()) {
            igId = igUserId;
        }
        final String igIdFinal = igId;
        final String igUsernameFinal = username;
        final String igNameFinal = name.isEmpty() ? username : name;

        // 3. IGSID 로 기존 유저 조회 (User.facebook_user_id 또는 instagram_accounts.ig_user_id)
        User existing = userRepository.findByFacebookUserId(igIdFinal).orElse(null);
        if (existing == null) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT user_id FROM instagram_accounts WHERE ig_user_id = ?", igIdFinal);
            if (!rows.isEmpty()) {
                Long dbUserId = ((Number) rows.get(0).get("user_id")).longValue();
                existing = userRepository.findById(dbUserId).orElse(null);
            }
        }

        if (existing != null) {
            // 4-A. 기존 유저 → IG 토큰 갱신 + JWT 발급 + IG 재연결 (자산 list 분기).
            jdbcTemplate.update(
                    "UPDATE users SET facebook_user_id = ?, facebook_access_token = ?, facebook_token_expires_at = ? WHERE id = ?",
                    igIdFinal, encryptionUtil.encrypt(longLivedToken),
                    java.sql.Timestamp.valueOf(LocalDateTime.now().plusDays(60)),
                    existing.getId());
            log.info("IG 로그인(기존 유저): userId={}, igUsername={}", existing.getId(), igUsernameFinal);

            // JWT 먼저 발급 — 자산 선택 페이지에서 로그인 상태 필요
            String token = authService.generateToken(existing);

            // IG 자산 list 분기 — 1개면 자동, 여러 개면 select 페이지로 (handleConnectFlow 와 동일)
            try {
                java.util.List<JsonNode> assets = fetchInstagramAssets(longLivedToken);
                if (assets.isEmpty()) {
                    log.warn("IG 자산 없음 (signup, 기존 유저): userId={}", existing.getId());
                    return redirectToFrontend("/auth/callback",
                            "token=" + token
                                    + "&email=" + urlEncode(existing.getEmail())
                                    + "&name=" + urlEncode(existing.getName() != null ? existing.getName() : "")
                                    + "&ig_status=reconnect_failed&ig_error=NO_IG_ASSET");
                }
                if (assets.size() == 1) {
                    InstagramAccount acc = instagramApiService.connectInstagramDirect(existing, longLivedToken, assets.get(0));
                    log.info("IG 재연결 성공 (signup, 자산 1개 자동): userId={}, igUsername={}",
                            existing.getId(), acc.getUsername());
                    return redirectToFrontend("/auth/callback",
                            "token=" + token
                                    + "&email=" + urlEncode(existing.getEmail())
                                    + "&name=" + urlEncode(existing.getName() != null ? existing.getName() : "")
                                    + "&ig_status=connected");
                }
                // 자산 여러 개 — select 페이지로
                log.info("IG 자산 {}개 (signup) — select 페이지로: userId={}",
                        assets.size(), existing.getId());
                return redirectToFrontend("/auth/callback",
                        "token=" + token
                                + "&email=" + urlEncode(existing.getEmail())
                                + "&name=" + urlEncode(existing.getName() != null ? existing.getName() : "")
                                + "&ig_status=select_required&next=/app/instagram/select");
            } catch (Exception e) {
                log.error("IG 재연결 중 예외 (signup): userId={}, error={}", existing.getId(), e.getMessage(), e);
                return redirectToFrontend("/auth/callback",
                        "token=" + token
                                + "&email=" + urlEncode(existing.getEmail())
                                + "&name=" + urlEncode(existing.getName() != null ? existing.getName() : "")
                                + "&ig_status=reconnect_failed&ig_error=UNKNOWN&ig_reason="
                                + urlEncode(e.getMessage() != null ? e.getMessage() : ""));
            }
        }

        // 4-B. 신규 가입 → User 생성은 하지 않고 pending 토큰만 발급 → 이메일 입력 페이지로.
        String encryptedIgToken = encryptionUtil.encrypt(longLivedToken);
        String pendingToken = authService.generatePendingSignupToken(
                igIdFinal, encryptedIgToken, igUsernameFinal, igNameFinal);
        log.info("IG OAuth 신규 가입 후보 — 이메일 입력 단계로: igsid={}, igUsername={}", igIdFinal, igUsernameFinal);

        String params = "pending_token=" + urlEncode(pendingToken)
                + "&ig_username=" + urlEncode(igUsernameFinal)
                + "&ig_name=" + urlEncode(igNameFinal);
        return redirectToFrontend("/onboarding/email", params);
    }

    /**
     * 기존 유저 IG 연결 플로우.
     * <p>
     * IG 자산 list 가 1개면 자동 연결, 여러 개면 frontend 의 자산 선택 페이지로
     * redirect 하여 사용자가 명시적으로 선택하게 한다 (매니챗과 동일 UX).
     * Page Access Token 은 user.facebookAccessToken 에 일시 저장되어 있다가
     * 사용자가 자산 선택 시 /api/instagram/select-asset endpoint 가 그 토큰으로
     * /me/accounts 다시 호출 → 선택한 page 의 정보 추출 → connectInstagramDirect.
     */
    private ResponseEntity<String> handleConnectFlow(User user, String shortLivedToken, String igUserId) {
        // 장기 토큰 교환 + 저장
        String longLivedToken;
        try {
            longLivedToken = instagramApiService.exchangeLongLivedToken(shortLivedToken);
        } catch (Exception e) {
            log.error("장기 토큰 교환 실패: userId={}, error={}", user.getId(), e.getMessage());
            return redirectToFrontend("/app/onboarding", "ig_error=ig_token_exchange_failed");
        }

        user.setFacebookAccessToken(encryptionUtil.encrypt(longLivedToken));
        user.setFacebookTokenExpiresAt(LocalDateTime.now().plusDays(60));
        userRepository.save(user);

        try {
            java.util.List<JsonNode> assets = fetchInstagramAssets(longLivedToken);
            if (assets.isEmpty()) {
                log.warn("IG 자산 없음: userId={}", user.getId());
                return redirectToFrontend("/app/onboarding",
                        "ig_error=NO_IG_ASSET&ig_reason=" + urlEncode("연결된 Instagram 비즈니스 계정이 없습니다."));
            }
            if (assets.size() == 1) {
                InstagramAccount acc = instagramApiService.connectInstagramDirect(user, longLivedToken, assets.get(0));
                log.info("IG 연결 성공 (자산 1개 자동 연결): userId={}, igUsername={}",
                        user.getId(), acc.getUsername());
                return redirectToFrontend("/app/onboarding",
                        "ig_connected=true&username=" + urlEncode(acc.getUsername()));
            }
            // 여러 자산 — frontend 자산 선택 페이지로 redirect
            log.info("IG 자산 {}개 발견 — 사용자 선택 페이지로 redirect: userId={}",
                    assets.size(), user.getId());
            return redirectToFrontend("/app/instagram/select", "");
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

    // ─── IG 자산 선택 (매니챗 동일 UX — 사용자가 어떤 IG 계정 연결할지 선택) ───

    /**
     * 인증된 user 의 facebookAccessToken 으로 /me/accounts 조회 → IG 자산 list 반환.
     * <p>
     * frontend 의 자산 선택 페이지에서 호출. page_access_token 은 응답에서 제외 (보안).
     *
     * @return {assets: [{user_id, username, name, profile_picture_url, followers_count, page_id}, ...]}
     */
    @GetMapping("/api/instagram/assets")
    public ResponseEntity<Map<String, Object>> getAssets() {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "SESSION_EXPIRED"));
        }
        String encryptedToken = user.getFacebookAccessToken();
        if (encryptedToken == null || user.getFacebookTokenExpiresAt() == null
                || user.getFacebookTokenExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(400).body(Map.of("error", "NO_FB_TOKEN",
                    "message", "Facebook 인증이 필요합니다. Instagram 다시 연결해주세요."));
        }
        try {
            String userToken = encryptionUtil.decrypt(encryptedToken);
            java.util.List<JsonNode> assets = fetchInstagramAssets(userToken);
            // page_access_token 제외하고 반환 (보안)
            java.util.List<Map<String, Object>> safe = new java.util.ArrayList<>();
            for (JsonNode a : assets) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("user_id", a.path("user_id").asText());
                entry.put("username", a.path("username").asText());
                entry.put("name", a.path("name").asText());
                entry.put("profile_picture_url", a.path("profile_picture_url").asText());
                entry.put("followers_count", a.path("followers_count").asInt(0));
                entry.put("page_id", a.path("page_id").asText());
                safe.add(entry);
            }
            return ResponseEntity.ok(Map.of("assets", safe));
        } catch (Exception e) {
            log.error("IG 자산 조회 실패: userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "FETCH_FAILED",
                    "message", e.getMessage()));
        }
    }

    /**
     * 사용자가 자산 선택 페이지에서 IG 계정 선택 시 호출.
     * <p>
     * body: {pageId: "...", igUserId: "..."}
     * <p>
     * facebookAccessToken 으로 /me/accounts 다시 호출 → 선택한 page 찾아 page_access_token
     * 추출 → connectInstagramDirect 로 InstagramAccount 저장.
     */
    @PostMapping("/api/instagram/select-asset")
    public ResponseEntity<Map<String, Object>> selectAsset(@RequestBody Map<String, String> body) {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "SESSION_EXPIRED"));
        }
        String pageId = body.get("pageId");
        String igUserId = body.get("igUserId");
        if (pageId == null || pageId.isBlank() || igUserId == null || igUserId.isBlank()) {
            return ResponseEntity.status(400).body(Map.of("success", false, "error", "MISSING_PARAMS"));
        }
        String encryptedToken = user.getFacebookAccessToken();
        if (encryptedToken == null) {
            return ResponseEntity.status(400).body(Map.of("success", false, "error", "NO_FB_TOKEN"));
        }
        try {
            String userToken = encryptionUtil.decrypt(encryptedToken);
            java.util.List<JsonNode> assets = fetchInstagramAssets(userToken);
            for (JsonNode asset : assets) {
                if (pageId.equals(asset.path("page_id").asText())
                        && igUserId.equals(asset.path("user_id").asText())) {
                    InstagramAccount acc = instagramApiService.connectInstagramDirect(user, userToken, asset);
                    log.info("IG 자산 선택 + 연결 완료: userId={}, igUsername={}, pageId={}",
                            user.getId(), acc.getUsername(), pageId);
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "username", acc.getUsername(),
                            "igUserId", acc.getIgUserId()));
                }
            }
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "ASSET_NOT_FOUND"));
        } catch (IgConnectionException e) {
            return ResponseEntity.status(400).body(Map.of(
                    "success", false, "error", e.getCode(), "message", e.getMessage()));
        } catch (Exception e) {
            log.error("IG 자산 선택 실패: userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false, "error", "UNKNOWN", "message", e.getMessage()));
        }
    }

    // ─── 재시도 (저장된 IG 토큰 사용, OAuth 스킵) ───

    @PostMapping("/api/instagram/retry-connect")
    public ResponseEntity<Map<String, Object>> retryConnect() {
        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
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
                    "error", "IG_TOKEN_MISSING",
                    "message", "Instagram 인증이 필요합니다. Instagram 연결하기를 다시 눌러주세요."
            ));
        }

        String igToken;
        try {
            igToken = encryptionUtil.decrypt(encryptedToken);
        } catch (Exception e) {
            log.error("IG 토큰 복호화 실패: userId={}", userId);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "IG_TOKEN_INVALID",
                    "message", "저장된 Instagram 토큰이 유효하지 않습니다. 다시 로그인해주세요."
            ));
        }

        try {
            JsonNode igProfile = fetchInstagramProfile(igToken);
            InstagramAccount acc = instagramApiService.connectInstagramDirect(user, igToken, igProfile);
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

    /**
     * Facebook Login 코드 → 단기 Facebook User Access Token 교환.
     * <p>
     * Meta Login for Business 의 OAuth code grant flow.
     * 응답: {@code {"access_token": "EAA...", "token_type": "bearer", "expires_in": 3600}}
     * <p>
     * 토큰은 Facebook User Token (FB User 의 동의 컨텍스트). 이 토큰으로
     * {@code GET /me/accounts} 호출하면 사용자가 관리하는 Page list 와 각 Page 의
     * Page Access Token 을 받을 수 있고, Page 의 {@code instagram_business_account}
     * 필드로 IG 연결된 계정을 식별한다.
     *
     * @param code OAuth 콜백의 ?code= 파라미터
     * @return token JSON
     */
    private JsonNode exchangeCodeForToken(String code) {
        // RestTemplate.getForObject(String, ...) 는 URL 을 URI Template 로 처리해서 이미 encoded 된
        // 문자 (% 포함) 를 또 encoding 한다 (% → %25). Facebook 이 이를 decode 시
        // "redirect_uri isn't an absolute URI" 로 거부 (code 191).
        // URI.create() 로 명시적 URI 객체를 만들어 전달하면 추가 encoding 우회.
        java.net.URI uri = java.net.URI.create("https://graph.facebook.com/v25.0/oauth/access_token"
                + "?client_id=" + urlEncode(appId)
                + "&client_secret=" + urlEncode(appSecret)
                + "&redirect_uri=" + urlEncode(redirectUri)
                + "&code=" + urlEncode(code));
        return restTemplate.getForObject(uri, JsonNode.class);
    }

    /**
     * 사용자가 관리하는 Page 들 중 Instagram 자산이 연결된 첫 번째 Page 의 정보 조회.
     * <p>
     * Facebook Login for Business 의 핵심 단계 — User Token 은 IG API 직접 호출에
     * 사용 못 하고, IG 자산이 연결된 Page 의 Page Access Token 을 추출해야 graph.facebook.com
     * 으로 IG comment / messaging API 가 작동한다 (매니챗과 동일 구조).
     * <p>
     * 응답에서 IG account 정보 (id, username, name, profile_picture_url) 와 Page Token 을
     * 함께 추출. 이후 컨트롤러는 Page Token 을 {@code instagramAccount.accessToken} 컬럼에
     * 저장하고, IG account id 는 {@code igUserId} 컬럼에 저장한다 (기존 schema 재사용).
     *
     * @param userToken Facebook User Access Token
     * @return JSON: {"user_id":"<ig-user-id>","username":"...","name":"...",
     *               "profile_picture_url":"...","page_id":"<fb-page-id>",
     *               "page_access_token":"<page-token>"}
     * @throws IgConnectionException IG 연결된 Page 가 없거나 Meta API 호출 실패 시
     */
    private JsonNode fetchInstagramProfile(String userToken) {
        // URI.create() 사용 — fields 값에 {} 가 포함돼있어 RestTemplate 의 URI Template
        // 처리가 잘못 해석할 수 있으므로 명시적 URI 객체로 변환.
        // account_type 필드는 v25.0 에서 instagram_business_account edge 에 더 이상 없음.
        // 제거 — IG 자산 식별엔 id, username 으로 충분.
        java.net.URI uri = java.net.URI.create("https://graph.facebook.com/v25.0/me/accounts"
                + "?fields=id,name,access_token,instagram_business_account%7Bid,username,name,profile_picture_url,followers_count%7D"
                + "&access_token=" + urlEncode(userToken));
        JsonNode accounts = restTemplate.getForObject(uri, JsonNode.class);
        if (accounts == null || !accounts.has("data") || accounts.get("data").size() == 0) {
            throw new IgConnectionException("NO_FB_PAGE",
                    "연결된 Facebook 페이지가 없습니다. 먼저 Instagram 비즈니스 계정과 Facebook 페이지를 연결해주세요.");
        }

        // IG 자산이 연결된 첫 번째 Page 선택 — OAuth 동의 화면에서 사용자가 선택한 Page 만
        // 응답에 포함됨 (config_id 의 asset_type=Instagram Business Account 효과).
        for (JsonNode page : accounts.get("data")) {
            JsonNode iga = page.get("instagram_business_account");
            if (iga != null && !iga.isNull() && iga.has("id")) {
                com.fasterxml.jackson.databind.node.ObjectNode result =
                        com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
                result.put("user_id", iga.get("id").asText());
                result.put("username", iga.path("username").asText(""));
                result.put("name", iga.path("name").asText(iga.path("username").asText("")));
                result.put("profile_picture_url", iga.path("profile_picture_url").asText(""));
                if (iga.has("followers_count")) {
                    result.put("followers_count", iga.get("followers_count").asInt());
                }
                if (iga.has("account_type")) {
                    result.put("account_type", iga.get("account_type").asText());
                }
                result.put("page_id", page.get("id").asText());
                result.put("page_access_token", page.get("access_token").asText());
                return result;
            }
        }
        throw new IgConnectionException("NO_IG_ON_PAGE",
                "선택한 Facebook 페이지에 Instagram 비즈니스 계정이 연결돼있지 않습니다.");
    }

    /**
     * /me/accounts 결과에서 IG 자산이 연결된 모든 Page 정보 list 반환.
     * <p>
     * fetchInstagramProfile 과 달리 첫 번째 자산만 반환하지 않고 list 전체 반환.
     * 매니챗처럼 사용자가 어떤 IG 계정 연결할지 선택할 수 있게 frontend 자산
     * 선택 UI 에서 사용.
     *
     * @param userToken Facebook User Access Token
     * @return 각 IG 자산의 정보 (user_id, username, name, profile_picture_url,
     *                          followers_count, page_id, page_access_token) list
     */
    private java.util.List<JsonNode> fetchInstagramAssets(String userToken) {
        String url = "https://graph.facebook.com/v25.0/me/accounts"
                + "?fields=id,name,access_token,instagram_business_account%7Bid,username,name,profile_picture_url,followers_count%7D"
                + "&access_token=" + urlEncode(userToken);
        JsonNode accounts = restTemplate.getForObject(java.net.URI.create(url), JsonNode.class);
        // 진단: /me/accounts raw 응답 — 어떤 Page 가 사용자 권한에 들어오는지 확인.
        // 다중 IG 자산이 비즈니스 포트폴리오에 등록돼있어도 /me/accounts 는 Facebook Page
        // 와 연결된 자산만 반환. Page 미연결 IG account 는 누락됨.
        log.info("/me/accounts 응답 (raw): {}", accounts);
        java.util.List<JsonNode> assets = new java.util.ArrayList<>();
        if (accounts == null || !accounts.has("data")) return assets;
        for (JsonNode page : accounts.get("data")) {
            JsonNode iga = page.get("instagram_business_account");
            if (iga != null && !iga.isNull() && iga.has("id")) {
                com.fasterxml.jackson.databind.node.ObjectNode result =
                        com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
                result.put("user_id", iga.get("id").asText());
                result.put("username", iga.path("username").asText(""));
                result.put("name", iga.path("name").asText(iga.path("username").asText("")));
                result.put("profile_picture_url", iga.path("profile_picture_url").asText(""));
                if (iga.has("followers_count")) {
                    result.put("followers_count", iga.get("followers_count").asInt());
                }
                result.put("page_id", page.get("id").asText());
                result.put("page_access_token", page.get("access_token").asText());
                assets.add(result);
            }
        }
        return assets;
    }

    /** 호환 placeholder — 더 이상 사용 안 함 (graph.instagram.com endpoint). */
    @SuppressWarnings("unused")
    private JsonNode fetchInstagramProfileLegacy(String accessToken) {
        String url = "https://graph.facebook.com/v25.0/me"
                + "?fields=user_id,username,name,profile_picture_url,followers_count,account_type"
                + "&access_token=" + accessToken;
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
