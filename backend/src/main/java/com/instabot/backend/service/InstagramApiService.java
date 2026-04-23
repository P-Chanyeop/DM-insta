package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.repository.InstagramAccountRepository;
import com.instabot.backend.config.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

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
    private final EncryptionUtil encryptionUtil;

    @Value("${instagram.api.base-url}")
    private String apiBaseUrl;

    @Value("${instagram.api.app-id}")
    private String appId;

    @Value("${instagram.api.app-secret}")
    private String appSecret;

    // ─── OAuth ───

    /**
     * Short-lived Instagram 토큰 → Long-lived 토큰으로 교환
     * Instagram Login API: GET https://graph.instagram.com/access_token
     */
    public String exchangeLongLivedToken(String shortLivedToken) {
        String url = "https://graph.instagram.com/access_token"
                + "?grant_type=ig_exchange_token"
                + "&client_secret=" + appSecret
                + "&access_token=" + shortLivedToken;

        ResponseEntity<JsonNode> resp = restTemplate.getForEntity(url, JsonNode.class);
        return resp.getBody().get("access_token").asText();
    }

    /**
     * Facebook Pages API를 통해 Instagram Business Account 연동
     *
     * 플로우 (Meta 공식):
     *  1. GET /me/accounts?access_token={fb_user_token}
     *     → 유저가 관리하는 Facebook 페이지 목록 (각 페이지마다 Page Access Token 포함)
     *  2. GET /{page_id}?fields=instagram_business_account&access_token={page_token}
     *     → 페이지에 연결된 IG Business Account ID 확인
     *  3. GET /{ig_business_id}?fields=id,username,profile_picture_url,followers_count&access_token={page_token}
     *     → IG 프로필 정보 조회
     *
     * 전제조건 (유저가 미리 해둬야 함):
     *  - Facebook 페이지 보유
     *  - Instagram 계정 = 비즈니스 / 크리에이터 계정
     *  - Facebook 페이지에 Instagram 계정 연결 완료
     *
     * @param fbUserToken 장기 Facebook User Access Token (이미 교환된 것)
     * @return 연결 성공 시 저장된 InstagramAccount
     * @throws IgConnectionException 연결 실패 사유 + 유저 친화적 메시지
     */
    public InstagramAccount connectInstagramViaFacebook(
            com.instabot.backend.entity.User user, String fbUserToken) {

        // 1. 유저가 관리하는 Facebook 페이지 목록 조회
        JsonNode pagesResp;
        try {
            pagesResp = restTemplate.getForObject(
                    "https://graph.facebook.com/v21.0/me/accounts?access_token=" + fbUserToken,
                    JsonNode.class);
        } catch (Exception e) {
            log.error("Facebook 페이지 목록 조회 실패: {}", e.getMessage());
            throw new IgConnectionException(
                    "FB_API_ERROR",
                    "Facebook API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        JsonNode pages = pagesResp != null ? pagesResp.path("data") : null;
        if (pages == null || !pages.isArray() || pages.isEmpty()) {
            throw new IgConnectionException(
                    "NO_FB_PAGE",
                    "연결 가능한 Facebook 페이지가 없습니다. 먼저 Facebook 페이지를 만들고 Instagram 계정과 연결해주세요.");
        }

        // 2. Instagram Business Account가 연결된 페이지 찾기
        String pageAccessToken = null;
        String pageId = null;
        String igBusinessId = null;

        for (JsonNode page : pages) {
            String pid = page.path("id").asText();
            String pageToken = page.path("access_token").asText();
            if (pid.isEmpty() || pageToken.isEmpty()) continue;

            try {
                JsonNode igInfo = restTemplate.getForObject(
                        "https://graph.facebook.com/v21.0/" + pid
                                + "?fields=instagram_business_account&access_token=" + pageToken,
                        JsonNode.class);
                if (igInfo != null && igInfo.has("instagram_business_account")) {
                    igBusinessId = igInfo.path("instagram_business_account").path("id").asText(null);
                    if (igBusinessId != null) {
                        pageAccessToken = pageToken;
                        pageId = pid;
                        log.info("IG Business Account 발견: userId={}, pageId={}, igId={}",
                                user.getId(), pageId, igBusinessId);
                        break;
                    }
                }
            } catch (Exception e) {
                log.warn("페이지 {} IG 정보 조회 실패 (건너뜀): {}", pid, e.getMessage());
            }
        }

        if (igBusinessId == null) {
            throw new IgConnectionException(
                    "NO_IG_BUSINESS",
                    "Instagram 비즈니스 계정이 연결된 Facebook 페이지를 찾을 수 없습니다. " +
                    "Instagram 앱에서 '프로페셔널 계정으로 전환' 후 Facebook 페이지와 연결해주세요.");
        }

        // 3. Instagram 프로필 정보 조회 (페이지 액세스 토큰 사용)
        JsonNode profile;
        try {
            profile = restTemplate.getForObject(
                    "https://graph.facebook.com/v21.0/" + igBusinessId
                            + "?fields=id,username,name,profile_picture_url,followers_count"
                            + "&access_token=" + pageAccessToken,
                    JsonNode.class);
        } catch (Exception e) {
            log.error("IG 프로필 조회 실패: igId={}, error={}", igBusinessId, e.getMessage());
            throw new IgConnectionException(
                    "IG_PROFILE_ERROR",
                    "Instagram 프로필 조회에 실패했습니다. 권한을 다시 확인해주세요.");
        }

        String username = profile.path("username").asText("");

        // 4. 기존 계정 있으면 업데이트, 없으면 생성
        InstagramAccount account = instagramAccountRepository.findByIgUserId(igBusinessId)
                .orElse(InstagramAccount.builder()
                        .user(user)
                        .igUserId(igBusinessId)
                        .build());

        // 소유자 검증: 이미 다른 유저가 연결한 계정이면 거부
        if (account.getId() != null && !account.getUser().getId().equals(user.getId())) {
            throw new IgConnectionException(
                    "IG_ALREADY_OWNED",
                    "이미 다른 센드잇 계정에 연결된 Instagram 계정입니다.");
        }

        account.setUsername(username);
        // Instagram Graph API 호출에는 Page Access Token 사용
        account.setAccessToken(encryptionUtil.encrypt(pageAccessToken));
        account.setConnected(true);
        account.setActive(true);
        account.setConnectedAt(LocalDateTime.now());
        account.setTokenExpiresAt(LocalDateTime.now().plusDays(60));

        if (profile.has("profile_picture_url")) {
            account.setProfilePictureUrl(profile.path("profile_picture_url").asText());
        }
        if (profile.has("followers_count")) {
            account.setFollowersCount(profile.path("followers_count").asLong());
        }

        return instagramAccountRepository.save(account);
    }

    /**
     * Instagram Login OAuth로 직접 IG 계정 연결 (Facebook 페이지 경유 불필요)
     *
     * Instagram OAuth에서 받은 토큰 + 프로필 정보로 바로 InstagramAccount 생성/업데이트.
     * Facebook Login 방식과 달리 페이지 조회 없이 직접 Instagram 계정 정보를 사용.
     *
     * @param user 유저 엔티티
     * @param igAccessToken 장기 Instagram User Access Token
     * @param igProfile Instagram Graph API /me 응답 (user_id, username, name, profile_picture_url, followers_count)
     * @return 저장된 InstagramAccount
     */
    public InstagramAccount connectInstagramDirect(
            com.instabot.backend.entity.User user, String igAccessToken, JsonNode igProfile) {

        String igUserId = igProfile.path("user_id").asText(null);
        if (igUserId == null || igUserId.isEmpty()) {
            igUserId = String.valueOf(igProfile.path("id").asLong(0));
        }
        if (igUserId == null || igUserId.equals("0")) {
            throw new IgConnectionException("NO_IG_USER_ID",
                    "Instagram 사용자 ID를 가져올 수 없습니다. 다시 시도해주세요.");
        }

        String username = igProfile.path("username").asText("");
        String accountType = igProfile.path("account_type").asText("");

        // 비즈니스/크리에이터 계정 확인 (BUSINESS, MEDIA_CREATOR, CREATOR_ACCOUNT 등)
        // Instagram Login은 비즈니스/크리에이터 계정만 지원
        log.info("Instagram 계정 타입: userId={}, igUserId={}, accountType={}", user.getId(), igUserId, accountType);

        // 기존 계정 있으면 업데이트, 없으면 생성
        InstagramAccount account = instagramAccountRepository.findByIgUserId(igUserId)
                .orElse(InstagramAccount.builder()
                        .user(user)
                        .igUserId(igUserId)
                        .build());

        // 소유자 검증: 이미 다른 유저가 연결한 계정이면 거부
        if (account.getId() != null && !account.getUser().getId().equals(user.getId())) {
            throw new IgConnectionException(
                    "IG_ALREADY_OWNED",
                    "이미 다른 센드잇 계정에 연결된 Instagram 계정입니다.");
        }

        account.setUsername(username);
        // Instagram User Access Token 직접 저장 (Page Token이 아닌 User Token)
        account.setAccessToken(encryptionUtil.encrypt(igAccessToken));
        account.setConnected(true);
        account.setActive(true);
        account.setConnectedAt(LocalDateTime.now());
        account.setTokenExpiresAt(LocalDateTime.now().plusDays(60));

        if (igProfile.has("profile_picture_url")) {
            account.setProfilePictureUrl(igProfile.path("profile_picture_url").asText());
        }
        if (igProfile.has("followers_count")) {
            account.setFollowersCount(igProfile.path("followers_count").asLong());
        }

        InstagramAccount saved = instagramAccountRepository.save(account);
        log.info("Instagram 계정 연결 완료: userId={}, igUserId={}, username={}", user.getId(), igUserId, username);
        return saved;
    }

    /**
     * 하위 호환 유지용: 기존 시그니처로 호출되는 곳들 위해 제공
     * short-lived 토큰을 장기 토큰으로 바꾼 뒤 connectInstagramViaFacebook 호출
     */
    public InstagramAccount exchangeAndSaveToken(Long userId, String shortLivedToken,
                                                  com.instabot.backend.entity.User user) {
        String longLivedToken = exchangeLongLivedToken(shortLivedToken);
        return connectInstagramViaFacebook(user, longLivedToken);
    }

    /**
     * Instagram 연동 실패 사유 코드 + 유저 친화적 메시지
     */
    public static class IgConnectionException extends RuntimeException {
        private final String code;
        public IgConnectionException(String code, String message) {
            super(message);
            this.code = code;
        }
        public String getCode() { return code; }
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
     * Private Reply — 댓글에 대한 DM 응답.
     * 사용자가 먼저 DM 을 보내지 않았어도 댓글 ID 를 통해 DM 을 보낼 수 있게 해줌.
     * (Instagram 의 "24시간 메시징 창" 제한 우회 — 이 호출로 창이 열림)
     * <p>
     * 한 댓글당 1회만 허용. 이후 같은 사용자에겐 일반 sendTextMessage 로 24시간 내 자유 발신 가능.
     *
     * @param igUserId    봇 IG 계정 ID
     * @param commentId   답장할 댓글 ID (webhook 으로 받은 값)
     * @param text        보낼 메시지
     * @param accessToken 페이지 액세스 토큰
     */
    public JsonNode sendPrivateReplyToComment(String igUserId, String commentId, String text, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = Map.of(
                "recipient", Map.of("comment_id", commentId),
                "message", Map.of("text", text)
        );

        log.info("Private reply 발송: igUserId={}, commentId={}", igUserId, commentId);
        return postToInstagram(url, body, accessToken);
    }

    /**
     * Private Reply + 포스트백 버튼 (Generic Template) — 1회 호출로 텍스트 + 클릭 버튼을 함께 전송.
     * <p>
     * 왜 이게 필요한가: Private Reply 는 bot→user 1회 발신만 허용하고 24시간 창을 열진 않음.
     * 창을 실제로 열려면 사용자가 응답(답장/버튼 클릭)해야 함. 따라서 오프닝 DM 에 버튼을
     * 같이 넣어 "버튼을 눌러 진행" 플로우로 만들어야 후속 DM 이 막히지 않음.
     * <p>
     * Instagram Private Reply 는 quick_reply 를 지원하지 않지만 generic_template(카드+버튼) 은 지원함.
     *
     * @param title         카드 제목 (= 오프닝 DM 본문. 80자 제한)
     * @param buttonTitle   버튼 라벨 (예: "가격표 보기")
     * @param buttonPayload 버튼 클릭 시 webhook 으로 들어올 포스트백 payload (예: "OPENING_DM_CLICKED")
     */
    public JsonNode sendPrivateReplyWithPostbackButton(String igUserId, String commentId,
                                                        String title, String buttonTitle,
                                                        String buttonPayload, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = Map.of(
                "recipient", Map.of("comment_id", commentId),
                "message", Map.of(
                        "attachment", Map.of(
                                "type", "template",
                                "payload", Map.of(
                                        "template_type", "generic",
                                        "elements", List.of(Map.of(
                                                "title", title,
                                                "buttons", List.of(Map.of(
                                                        "type", "postback",
                                                        "title", buttonTitle,
                                                        "payload", buttonPayload
                                                ))
                                        ))
                                )
                        )
                )
        );

        log.info("Private reply (with button) 발송: igUserId={}, commentId={}, button={}",
                igUserId, commentId, buttonTitle);
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
     * Generic Template (postback 버튼 포함) DM 발송 — 24h 창이 열린 상태에서 사용.
     * <p>
     * Quick Reply 는 칩/토스트 형태로 말풍선 밖에 표시되고 Instagram 이 message 이벤트로
     * 전달하기 때문에 postback 핸들러를 태우려면 별도 처리가 필요함. 반면 generic_template +
     * postback 버튼은 카드 안에 버튼이 박혀 UI 가 일관되고 클릭 시 postback 이벤트로 깔끔히
     * 들어옴. 오프닝 DM UX 를 댓글 트리거 경로와 통일하려고 추가.
     */
    public JsonNode sendGenericTemplateWithPostback(String igUserId, String recipientId, String title,
                                                     String buttonTitle, String buttonPayload,
                                                     String accessToken) {
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
                                                "buttons", List.of(Map.of(
                                                        "type", "postback",
                                                        "title", buttonTitle,
                                                        "payload", buttonPayload
                                                ))
                                        ))
                                )
                        )
                )
        );

        log.info("Generic template (postback) 발송: igUserId={}, recipient={}, button={}",
                igUserId, recipientId, buttonTitle);
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

    /**
     * 캐러셀 (다중 카드 Generic Template) DM 발송
     * Instagram Generic Template은 elements 배열로 여러 카드를 스와이프 형태로 표시
     */
    public JsonNode sendCarouselMessage(String igUserId, String recipientId,
                                         List<Map<String, Object>> cards, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        List<Map<String, Object>> elements = new ArrayList<>();
        for (Map<String, Object> card : cards) {
            // title은 필수 — 빈 title 카드는 건너뜀
            String title = Objects.toString(card.getOrDefault("title", ""), "");
            if (title.isBlank()) continue;

            Map<String, Object> element = new LinkedHashMap<>();
            element.put("title", title);

            String subtitle = Objects.toString(card.getOrDefault("subtitle", ""), "");
            if (!subtitle.isBlank()) {
                element.put("subtitle", subtitle);
            }

            String imageUrl = Objects.toString(card.getOrDefault("imageUrl", ""), "");
            if (!imageUrl.isBlank()) {
                element.put("image_url", imageUrl);
            }

            String btnText = Objects.toString(card.getOrDefault("buttonText", ""), "");
            String btnUrl = Objects.toString(card.getOrDefault("buttonUrl", ""), "");
            if (!btnText.isBlank() && !btnUrl.isBlank()) {
                element.put("buttons", List.of(Map.of(
                        "type", "web_url",
                        "url", btnUrl,
                        "title", btnText
                )));
            }

            elements.add(element);
        }

        // Instagram Generic Template은 최소 1개, 최대 10개 elements 필요
        if (elements.isEmpty()) {
            log.warn("캐러셀 발송 실패: 유효한 카드가 없습니다");
            return null;
        }
        if (elements.size() > 10) {
            log.warn("캐러셀 카드 수 초과 ({}개), 10개로 제한합니다", elements.size());
            elements = elements.subList(0, 10);
        }

        Map<String, Object> body = Map.of(
                "recipient", Map.of("id", recipientId),
                "message", Map.of(
                        "attachment", Map.of(
                                "type", "template",
                                "payload", Map.of(
                                        "template_type", "generic",
                                        "elements", elements
                                )
                        )
                )
        );

        return postToInstagram(url, body, accessToken);
    }

    /**
     * 이미지 DM 발송 (URL 기반)
     */
    public JsonNode sendImageMessage(String igUserId, String recipientId, String imageUrl, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = Map.of(
                "recipient", Map.of("id", recipientId),
                "message", Map.of(
                        "attachment", Map.of(
                                "type", "image",
                                "payload", Map.of("url", imageUrl)
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
     *
     * Instagram Graph API를 통해 팔로워 목록을 조회하여 특정 사용자 포함 여부 확인.
     * API 제한으로 최대 100명까지만 확인 가능하며, 팔로워가 많은 계정에서는
     * 최근 팔로워만 조회되므로 100% 정확하지 않을 수 있음.
     *
     * 참고: Instagram은 1:1 팔로우 여부 확인 API가 없어서
     *       팔로워 목록 페이징으로 우회 조회함.
     */
    public boolean isFollower(String igUserId, String checkUserId, String accessToken) {
        try {
            // Instagram Graph API: 팔로워 목록 조회 (비즈니스/크리에이터 계정만 가능)
            String url = apiBaseUrl + "/v21.0/" + igUserId
                    + "/followers?fields=id&limit=100&access_token=" + accessToken;

            ResponseEntity<JsonNode> resp = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = resp.getBody();

            if (body != null && body.has("data")) {
                for (JsonNode follower : body.get("data")) {
                    if (checkUserId.equals(follower.path("id").asText())) {
                        log.info("팔로우 확인됨: igUserId={}, follower={}", igUserId, checkUserId);
                        return true;
                    }
                }
            }

            log.info("팔로우 미확인: igUserId={}, checkUserId={}", igUserId, checkUserId);
            return false;

        } catch (Exception e) {
            // API 호출 실패 (권한 부족, 비즈니스 계정 아님 등)
            // → 안전하게 미팔로우로 처리 (사용자가 재확인 버튼으로 재시도 가능)
            log.warn("팔로우 확인 API 호출 실패 (미팔로우로 처리): igUserId={}, error={}", igUserId, e.getMessage());
            return false;
        }
    }

    // ─── Ice Breaker / Persistent Menu ───

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

    public JsonNode deleteIceBreakers(String igUserId, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messenger_profile";
        Map<String, Object> body = Map.of("fields", List.of("ice_breakers"));
        return deleteFromInstagram(url, body, accessToken);
    }

    public JsonNode setPersistentMenu(String igUserId, List<Map<String, Object>> menuItems, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messenger_profile";

        List<Map<String, Object>> callToActions = menuItems.stream()
                .map(item -> {
                    String type = Objects.toString(item.get("type"), "postback");
                    Map<String, Object> action = new HashMap<>();
                    action.put("title", Objects.toString(item.get("title"), ""));
                    action.put("type", type);
                    if ("web_url".equals(type)) {
                        action.put("url", Objects.toString(item.get("url"), ""));
                    } else {
                        action.put("payload", Objects.toString(item.getOrDefault("payload", item.get("title")), ""));
                    }
                    return action;
                })
                .toList();

        Map<String, Object> body = Map.of(
                "persistent_menu", List.of(
                        Map.of(
                                "locale", "default",
                                "call_to_actions", callToActions
                        )
                )
        );

        return postToInstagram(url, body, accessToken);
    }

    public JsonNode deletePersistentMenu(String igUserId, String accessToken) {
        String url = apiBaseUrl + "/v21.0/" + igUserId + "/messenger_profile";
        Map<String, Object> body = Map.of("fields", List.of("persistent_menu"));
        return deleteFromInstagram(url, body, accessToken);
    }

    private JsonNode deleteFromInstagram(String url, Map<String, Object> body, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.DELETE, request, JsonNode.class);
            log.debug("Instagram API DELETE 응답: {}", response.getBody());
            return response.getBody();
        } catch (Exception e) {
            log.error("Instagram API DELETE 호출 실패: url={}, error={}", url, e.getMessage());
            throw new RuntimeException("Instagram API 호출에 실패했습니다: " + e.getMessage());
        }
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
                String decryptedToken = encryptionUtil.decrypt(account.getAccessToken());
                String url = apiBaseUrl + "/v21.0/oauth/access_token"
                        + "?grant_type=ig_refresh_token"
                        + "&access_token=" + decryptedToken;

                ResponseEntity<JsonNode> resp = restTemplate.getForEntity(url, JsonNode.class);
                String newToken = resp.getBody().get("access_token").asText();

                account.setAccessToken(encryptionUtil.encrypt(newToken));
                account.setTokenExpiresAt(LocalDateTime.now().plusDays(60));
                instagramAccountRepository.save(account);

                log.info("토큰 갱신 완료: igUserId={}", account.getIgUserId());
            } catch (Exception e) {
                log.error("토큰 갱신 실패: igUserId={}, error={}", account.getIgUserId(), e.getMessage());
            }
        }
    }

    // ─── Recurring Notification API ───

    /**
     * 사용자에게 Recurring Notification 옵트인 요청 발송
     * Meta 공식 API: POST /{ig-user-id}/messages
     * notification_messages_token 을 응답으로 받음
     */
    public JsonNode requestRecurringOptIn(String igUserId, String recipientId,
                                           String message, String topic,
                                           String frequency, String accessToken) {
        String url = "https://graph.instagram.com/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("recipient", Map.of("id", recipientId));
        body.put("message", Map.of(
                "attachment", Map.of(
                        "type", "template",
                        "payload", Map.of(
                                "template_type", "notification_messages",
                                "title", message,
                                "notification_messages_frequency", frequency.toUpperCase(),
                                "notification_messages_topic", topic,
                                "notification_messages_cta_text", "알림 받기"
                        )
                )
        ));

        log.info("Recurring opt-in 요청: igUserId={}, recipient={}, topic={}", igUserId, recipientId, topic);
        return postToInstagram(url, body, accessToken);
    }

    /**
     * 24시간 외 Recurring Notification 메시지 발송
     * notification_messages_token을 사용하여 발송
     */
    public JsonNode sendRecurringNotification(String igUserId, String recipientId,
                                               String message, String notificationToken,
                                               String accessToken) {
        String url = "https://graph.instagram.com/v21.0/" + igUserId + "/messages";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("recipient", Map.of("id", recipientId, "notification_messages_token", notificationToken));
        body.put("message", Map.of("text", message));

        log.info("Recurring notification 발송: igUserId={}, recipient={}", igUserId, recipientId);
        return postToInstagram(url, body, accessToken);
    }

    /**
     * Webhook 구독 — IG 계정을 앱 webhook에 구독.
     * POST /{ig-user-id}/subscribed_apps?subscribed_fields=...&access_token=...
     *
     * 이 호출이 없으면 Meta가 해당 IG 계정의 DM/댓글 이벤트를 webhook URL로 전달하지 않음.
     * 계정 연결 직후와 토큰 갱신 후 호출 필요.
     */
    public boolean subscribeAppToIgAccount(String igUserId, String accessToken) {
        // Meta 공식 허용 필드 (2026 기준):
        //   messages, messaging_postbacks, messaging_seen, messaging_optins,
        //   message_reactions, message_edit, comments, live_comments, mentions, ...
        // 센드잇은 DM/댓글 자동화에 필수인 것만 구독.
        String fields = "messages,messaging_postbacks,messaging_seen,message_reactions,comments";
        String url = "https://graph.instagram.com/v21.0/" + igUserId
                + "/subscribed_apps?subscribed_fields=" + fields
                + "&access_token=" + accessToken;

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, null, JsonNode.class);
            JsonNode body = response.getBody();
            boolean success = body != null && body.path("success").asBoolean(false);
            log.info("Webhook 구독 {}: igUserId={}, response={}",
                    success ? "성공" : "응답 확인 필요", igUserId, body);
            return success;
        } catch (Exception e) {
            log.error("Webhook 구독 실패: igUserId={}, error={}", igUserId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 진단용: IG 계정의 현재 subscribed_apps 상태 조회.
     * GET /{ig-user-id}/subscribed_apps?access_token=...
     * 응답 예: { "data": [{ "name": "MyApp", "id": "...", "subscribed_fields": [...] }] }
     */
    public JsonNode getSubscribedApps(String igUserId, String accessToken) {
        String url = "https://graph.instagram.com/v21.0/" + igUserId
                + "/subscribed_apps?access_token=" + accessToken;
        try {
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            log.info("subscribed_apps 조회: igUserId={}, body={}", igUserId, response.getBody());
            return response.getBody();
        } catch (Exception e) {
            log.error("subscribed_apps 조회 실패: igUserId={}, error={}", igUserId, e.getMessage(), e);
            throw new RuntimeException("subscribed_apps 조회 실패: " + e.getMessage());
        }
    }

    /**
     * DM 발신자(IGSID)의 프로필 조회.
     * GET /{igsid}?fields=name,username,profile_pic&access_token=...
     * 페이지 스코프 ID (PSID)라 일반 Instagram user를 조회하는 건 아니고,
     * 이 IG Business 계정과 메시지 교환한 사용자에 한해 사용 가능.
     *
     * 반환 예: { "name": "홍길동", "username": "softcat", "profile_pic": "https://..." }
     * 권한/개인정보 설정에 따라 일부 필드 누락 가능.
     */
    public JsonNode fetchUserProfile(String igsid, String accessToken) {
        String url = "https://graph.instagram.com/v21.0/" + igsid
                + "?fields=name,username,profile_pic&access_token=" + accessToken;
        try {
            return restTemplate.getForObject(url, JsonNode.class);
        } catch (Exception e) {
            log.warn("fetchUserProfile 실패 (권한 제한 가능): igsid={}, error={}", igsid, e.getMessage());
            return null;
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

    /**
     * Decrypt the stored access token for API calls.
     */
    public String getDecryptedToken(InstagramAccount account) {
        return encryptionUtil.decrypt(account.getAccessToken());
    }
}
