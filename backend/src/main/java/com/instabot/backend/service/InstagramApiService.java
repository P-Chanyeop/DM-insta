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
     * Short-lived Facebook User Token → Long-lived Facebook User Token 교환.
     * <p>
     * Meta Login for Business 의 fb_exchange_token grant 사용.
     * 응답: {@code {"access_token": "EAA...", "token_type": "bearer", "expires_in": 5184000}}
     * (5184000s = 60 days)
     * <p>
     * 이후 컨트롤러는 이 long-lived User Token 으로 GET /me/accounts 를 호출해
     * IG 자산이 연결된 Page 의 Page Access Token 을 추출한다 (fetchInstagramProfile).
     *
     * @param shortLivedToken Facebook User Token (OAuth code 교환 직후 받은 단기 토큰)
     * @return long-lived Facebook User Token
     */
    public String exchangeLongLivedToken(String shortLivedToken) {
        String url = "https://graph.facebook.com/v25.0/oauth/access_token"
                + "?grant_type=fb_exchange_token"
                + "&client_id=" + appId
                + "&client_secret=" + appSecret
                + "&fb_exchange_token=" + shortLivedToken;

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
                    "https://graph.facebook.com/v25.0/me/accounts?access_token=" + fbUserToken,
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
                        "https://graph.facebook.com/v25.0/" + pid
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
                    "https://graph.facebook.com/v25.0/" + igBusinessId
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
     * Facebook Login for Business 통한 IG 계정 연결 — 매니챗과 동일 패턴.
     * <p>
     * 컨트롤러의 {@code fetchInstagramProfile()} 가 User Token 으로 /me/accounts 를
     * 조회해서 IG 자산 연결된 Page 를 찾고, 그 Page 의 Page Access Token + IG account
     * info 를 묶어 {@code igProfile} 로 전달한다. 여기서는 Page Token 을 access_token
     * 컬럼에 저장 (모든 IG API 가 Page Token 으로 호출되므로).
     *
     * @param user 유저 엔티티
     * @param userToken (참고용 — 더 이상 직접 저장 안 함, Page Token 으로 대체)
     * @param igProfile fetchInstagramProfile 결과 — user_id (IG account id), username,
     *                  name, profile_picture_url, followers_count, account_type,
     *                  page_id, page_access_token 포함
     * @return 저장된 InstagramAccount (access_token 컬럼에 Page Token 저장됨)
     */
    public InstagramAccount connectInstagramDirect(
            com.instabot.backend.entity.User user, String userToken, JsonNode igProfile) {

        String igUserId = igProfile.path("user_id").asText(null);
        if (igUserId == null || igUserId.isEmpty()) {
            igUserId = String.valueOf(igProfile.path("id").asLong(0));
        }
        if (igUserId == null || igUserId.equals("0")) {
            throw new IgConnectionException("NO_IG_USER_ID",
                    "Instagram 사용자 ID를 가져올 수 없습니다. 다시 시도해주세요.");
        }

        String pageAccessToken = igProfile.path("page_access_token").asText(null);
        String pageId = igProfile.path("page_id").asText(null);
        if (pageAccessToken == null || pageAccessToken.isEmpty()) {
            throw new IgConnectionException("NO_PAGE_TOKEN",
                    "Facebook Page Access Token 을 받지 못했습니다. OAuth 동의 화면에서 Page 를 선택했는지 확인해주세요.");
        }

        String username = igProfile.path("username").asText("");
        String accountType = igProfile.path("account_type").asText("");
        log.info("Instagram 계정 타입: userId={}, igUserId={}, accountType={}, pageId={}",
                user.getId(), igUserId, accountType, pageId);

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
        // Page Access Token 을 저장 — 모든 IG API (graph.facebook.com) 호출에 사용.
        account.setAccessToken(encryptionUtil.encrypt(pageAccessToken));
        account.setFbPageId(pageId);
        account.setConnected(true);
        account.setActive(true);
        account.setConnectedAt(LocalDateTime.now());
        // Page Token 은 User Token 의 만료시각을 상속받음 (60d). 보수적으로 60d.
        account.setTokenExpiresAt(LocalDateTime.now().plusDays(60));

        if (igProfile.has("profile_picture_url")) {
            account.setProfilePictureUrl(igProfile.path("profile_picture_url").asText());
        }
        if (igProfile.has("followers_count")) {
            account.setFollowersCount(igProfile.path("followers_count").asLong());
        }

        InstagramAccount saved = instagramAccountRepository.save(account);
        log.info("Instagram 계정 연결 완료: userId={}, igUserId={}, username={}, pageId={}",
                user.getId(), igUserId, username, pageId);
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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messages";

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
     * 댓글에 공개 답장(public reply) 발송.
     * <p>
     * 호스트는 {@code graph.instagram.com} 사용. graph.facebook.com 으로 보내면
     * IGUAT 가 인식되지 않아 401 [no body] 로 거절됨이 관측됨.
     * <p>
     * 호출 형식: {@code postToInstagram(url, body, accessToken)} — JSON body
     * + Bearer header. 4/23 까지 이 형식으로 정상 작동했다.
     * <p>
     * 과거에 commit {@code 2cf1a366} 에서 Meta docs 의 curl 예시처럼
     * {@code ?message=...&access_token=...} query param + empty body 형식으로
     * 변경했으나, 그 이후 (#100/subcode 33) 으로 거절되기 시작 — 명백한 회귀.
     * 4/23 시점 commit {@code 263ba26b} 의 형식으로 복원.
     * <p>
     * 실패 시 Meta 가 돌려주는 응답 body 를 그대로 로그에 남겨
     * subcode/fbtrace_id 까지 운영자가 확인할 수 있게 한다.
     *
     * @param commentId   답장할 댓글 ID (webhook value.id)
     * @param message     댓글로 게시할 텍스트
     * @param accessToken 발신 계정의 Instagram 액세스 토큰 (IGUAT)
     * @return Meta 응답 JSON (id 등)
     */
    /**
     * mediaId 의 owner 를 토큰으로 GET — 댓글 답장 100/33 진단용.
     * 본인 게시물이면 200 + owner 정보, 다른 사람 게시물이면 400.
     *
     * @param commentId 진단 컨텍스트 (로그용)
     * @param mediaId   조회할 IG media ID (webhook 의 mediaId)
     * @param accessToken 토큰
     */
    public void diagnoseMediaOwner(String commentId, String mediaId, String accessToken) {
        try {
            java.net.URI uri = java.net.URI.create(apiBaseUrl + "/v25.0/" + mediaId
                    + "?fields=id,permalink,owner,username,media_product_type"
                    + "&access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
            JsonNode info = restTemplate.getForObject(uri, JsonNode.class);
            log.error("진단 4 — mediaId owner: commentId={}, mediaId={}, mediaInfo={}",
                    commentId, mediaId, info);
        } catch (org.springframework.web.client.HttpStatusCodeException me) {
            log.error("진단 4 — mediaId GET 실패 (다른 사람 게시물 / 권한 없음): commentId={}, mediaId={}, status={}, body={}",
                    commentId, mediaId, me.getStatusCode(), me.getResponseBodyAsString());
        } catch (Exception me) {
            log.error("진단 4 — mediaId GET 중 예외: commentId={}, mediaId={}, error={}",
                    commentId, mediaId, me.getMessage());
        }
    }

    public JsonNode replyToComment(String commentId, String message, String accessToken) {
        // Meta Graph API Explorer 와 동일한 호출 형식으로 fix.
        //
        // Explorer 가 같은 토큰으로 같은 endpoint POST 시 100/33 가 아니라 code 2 transient
        // 를 받음 → endpoint 자체는 reach. 우리 백엔드만 100/33 거부 → 호출 형식 차이가 원인.
        //
        // Explorer 의 정확한 curl (사용자 화면에서 추출):
        //   POST https://graph.instagram.com/{commentId}/replies?message=...&access_token=...
        //
        // 차이점 4가지를 모두 Explorer 형식에 맞춤:
        //   1. URL 에 API 버전 없음 (v25.0 / v21.0 둘 다 100/33 받았으니 default 로 위임)
        //   2. message 를 query param 으로 (JSON body 아님)
        //   3. access_token 도 query param 으로 (Bearer header 아님)
        //   4. POST body 비우고 Content-Type 헤더 없음
        String url = apiBaseUrl + "/" + commentId + "/replies"
                + "?message=" + java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8)
                + "&access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, HttpEntity.EMPTY, JsonNode.class);
            log.debug("댓글 답장 응답: commentId={}, body={}", commentId, response.getBody());
            return response.getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("댓글 답장 실패 — commentId={}, status={}, metaResponse={}",
                    commentId, e.getStatusCode(), responseBody);

            // ─── 진단 1: 댓글 GET (단순 fields, URI 변수 충돌 회피) ───
            //  RestTemplate 의 URI 템플릿 처리 때문에 fields 안의 {} 를 변수로 오인하므로
            //  중첩 expansion (media{owner{...}}) 은 빼고 단순 필드만 본다.
            //   - GET 200 → 토큰이 댓글을 볼 수 있음. POST 만 거절됐다면 scope/reply-to-reply 문제
            //   - GET 400 (#100/33) → 토큰 자체가 이 댓글 시스템 ID 에 access 못 함
            try {
                java.net.URI getUri = java.net.URI.create(apiBaseUrl + "/v25.0/" + commentId
                        + "?fields=id,text,parent_id,from,user,hidden,timestamp"
                        + "&access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
                JsonNode commentInfo = restTemplate.getForObject(getUri, JsonNode.class);
                log.error("진단 1 — 댓글 GET 성공: commentId={}, commentInfo={}", commentId, commentInfo);
            } catch (org.springframework.web.client.HttpStatusCodeException ge) {
                log.error("진단 1 — 댓글 GET 실패: commentId={}, getStatus={}, getBody={}",
                        commentId, ge.getStatusCode(), ge.getResponseBodyAsString());
            } catch (Exception ge) {
                log.error("진단 1 — 댓글 GET 중 예외: commentId={}, error={}", commentId, ge.getMessage());
            }

            // ─── 진단 2: 토큰의 진짜 owner (GET /me) ───
            try {
                java.net.URI meUri = java.net.URI.create(apiBaseUrl + "/v25.0/me?fields=id,username,account_type"
                        + "&access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
                JsonNode meInfo = restTemplate.getForObject(meUri, JsonNode.class);
                log.error("진단 2 — 토큰 owner: commentId={}, me={}", commentId, meInfo);
            } catch (Exception me) {
                log.error("진단 2 — GET /me 실패: commentId={}, error={}", commentId, me.getMessage());
            }

            // ─── 진단 5: graph.instagram.com 의 /me/permissions ───
            //  IG Graph 에는 /me/permissions endpoint 가 없어서 'nonexisting field' 에러로 떨어짐 (확인됨).
            //  이건 IG Login(IGUAT) 시스템이 Facebook Graph 와 권한 모델이 완전히 다른 시스템이라는 단서.
            try {
                java.net.URI permUri = java.net.URI.create(apiBaseUrl + "/v25.0/me/permissions"
                        + "?access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
                JsonNode permInfo = restTemplate.getForObject(permUri, JsonNode.class);
                log.error("진단 5 — IG Graph 의 토큰 scope: commentId={}, permissions={}", commentId, permInfo);
            } catch (org.springframework.web.client.HttpStatusCodeException pe) {
                log.error("진단 5 — IG Graph /me/permissions 실패 (예상: nonexisting field): commentId={}, status={}, body={}",
                        commentId, pe.getStatusCode(), pe.getResponseBodyAsString());
            } catch (Exception pe) {
                log.error("진단 5 — IG Graph /me/permissions 중 예외: commentId={}, error={}", commentId, pe.getMessage());
            }

            // ─── 진단 6: graph.facebook.com 으로 commentId / permissions 시도 ───
            //  4/23 에 댓글 답장이 됐던 시점 토큰은 옛날 Facebook Login(Page Token) 일 가능성이 높음.
            //  4/25 fresh OAuth 후 토큰이 IGUAT 로 바뀌면서 회귀.
            //   - graph.facebook.com 의 /{commentId} 가 200 → commentId 는 FB Graph 시스템 ID
            //     → IG Graph 로는 access 불가. 답장도 graph.facebook.com 으로 보내야 함.
            //   - graph.facebook.com 의 /me/permissions 가 200 → 토큰이 Page Token 호환 (놀라움)
            //   - 둘 다 401/IGUAT-mismatch → IGUAT 로 댓글 답장 endpoint 자체가 아예 미지원
            String fbBase = "https://graph.facebook.com";
            try {
                java.net.URI fbCommentUri = java.net.URI.create(fbBase + "/v25.0/" + commentId
                        + "?fields=id,text,from,parent_id,hidden"
                        + "&access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
                JsonNode fbCommentInfo = restTemplate.getForObject(fbCommentUri, JsonNode.class);
                log.error("진단 6a — FB Graph 의 댓글 GET 성공 → commentId 는 FB 시스템: commentId={}, info={}",
                        commentId, fbCommentInfo);
            } catch (org.springframework.web.client.HttpStatusCodeException fe) {
                log.error("진단 6a — FB Graph 의 댓글 GET 실패: commentId={}, status={}, body={}",
                        commentId, fe.getStatusCode(), fe.getResponseBodyAsString());
            } catch (Exception fe) {
                log.error("진단 6a — FB Graph 댓글 GET 예외: commentId={}, error={}", commentId, fe.getMessage());
            }

            try {
                java.net.URI fbPermUri = java.net.URI.create(fbBase + "/v25.0/me/permissions"
                        + "?access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
                JsonNode fbPermInfo = restTemplate.getForObject(fbPermUri, JsonNode.class);
                log.error("진단 6b — FB Graph 의 토큰 scope: commentId={}, permissions={}",
                        commentId, fbPermInfo);
            } catch (org.springframework.web.client.HttpStatusCodeException fe) {
                log.error("진단 6b — FB Graph /me/permissions 실패: commentId={}, status={}, body={}",
                        commentId, fe.getStatusCode(), fe.getResponseBodyAsString());
            } catch (Exception fe) {
                log.error("진단 6b — FB Graph /me/permissions 예외: commentId={}, error={}", commentId, fe.getMessage());
            }

            // ─── 진단 3: 토큰으로 본인 미디어 list 확인 (GET /me/media) ───
            try {
                java.net.URI mediaUri = java.net.URI.create(apiBaseUrl + "/v25.0/me/media?fields=id,permalink&limit=10"
                        + "&access_token=" + java.net.URLEncoder.encode(accessToken, java.nio.charset.StandardCharsets.UTF_8));
                JsonNode mediaInfo = restTemplate.getForObject(mediaUri, JsonNode.class);
                log.error("진단 3 — /me/media (토큰 owner 의 최근 게시물 list): commentId={}, media={}",
                        commentId, mediaInfo);
            } catch (Exception ex) {
                log.error("진단 3 — /me/media 실패: commentId={}, error={}", commentId, ex.getMessage());
            }


            throw new RuntimeException("댓글 답장 실패: " + responseBody, e);
        } catch (Exception e) {
            log.error("댓글 답장 실패 — commentId={}, error={}", commentId, e.getMessage());
            throw new RuntimeException("댓글 답장 실패: " + e.getMessage(), e);
        }
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
            String url = apiBaseUrl + "/v25.0/" + igUserId
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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messenger_profile";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messenger_profile";
        Map<String, Object> body = Map.of("fields", List.of("ice_breakers"));
        return deleteFromInstagram(url, body, accessToken);
    }

    public JsonNode setPersistentMenu(String igUserId, List<Map<String, Object>> menuItems, String accessToken) {
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messenger_profile";

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
        String url = apiBaseUrl + "/v25.0/" + igUserId + "/messenger_profile";
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
                String url = apiBaseUrl + "/v25.0/oauth/access_token"
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
        String url = "https://graph.instagram.com/v25.0/" + igUserId + "/messages";

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
        String url = "https://graph.instagram.com/v25.0/" + igUserId + "/messages";

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
        String url = "https://graph.instagram.com/v25.0/" + igUserId
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
        String url = "https://graph.instagram.com/v25.0/" + igUserId
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
     * 게시물 permalink URL → 숫자 media ID 해석.
     * <p>
     * Flow 저장 시 댓글 트리거가 "특정 게시물" 로 설정되면 유저는 URL 을 입력하지만
     * webhook 은 numeric media ID (예: "17852345678") 를 보내므로 그대로는 매칭 안 됨.
     * GET /{ig-user-id}/media?fields=id,permalink 로 페이지네이션 돌면서 permalink 비교.
     * <p>
     * shortcode (URL 의 /p/ 또는 /reel/ 뒤 문자열) 만 비교해서 /p/ vs /reel/ 차이 무시.
     * 찾지 못하면 null 반환 — 호출 측에서 사용자에게 에러 제공.
     *
     * @return 매칭되는 media ID, 못 찾으면 null
     */
    public String resolveMediaIdFromPermalink(String permalink, String igUserId, String accessToken) {
        String targetShortcode = extractShortcode(permalink);
        if (targetShortcode == null) {
            log.warn("permalink 파싱 실패: {}", permalink);
            return null;
        }

        String url = "https://graph.instagram.com/v25.0/" + igUserId
                + "/media?fields=id,permalink&limit=50&access_token=" + accessToken;
        int pages = 0;
        int maxPages = 20; // 최대 1000개 게시물까지 스캔 — 그 이상이면 사용자가 최근 글 올려도 안 나옴. 충분.

        while (url != null && pages < maxPages) {
            try {
                JsonNode resp = restTemplate.getForObject(url, JsonNode.class);
                if (resp == null) break;

                for (JsonNode media : resp.path("data")) {
                    String mediaPermalink = media.path("permalink").asText("");
                    String shortcode = extractShortcode(mediaPermalink);
                    if (targetShortcode.equals(shortcode)) {
                        String mediaId = media.path("id").asText();
                        log.info("permalink 해석 성공: {} → mediaId={}", permalink, mediaId);
                        return mediaId;
                    }
                }

                JsonNode nextNode = resp.path("paging").path("next");
                url = nextNode.isMissingNode() || nextNode.isNull() ? null : nextNode.asText(null);
                pages++;
            } catch (Exception e) {
                log.warn("permalink 해석 중 API 호출 실패: url={}, error={}", url, e.getMessage());
                return null;
            }
        }

        log.warn("permalink 매칭 실패 ({} 페이지 스캔): {}", pages, permalink);
        return null;
    }

    /**
     * Instagram URL 에서 shortcode (permalink 의 고유 식별자) 추출.
     * <p>
     * 지원 포맷:
     *   https://www.instagram.com/p/DNe67IgBqVl/      → DNe67IgBqVl
     *   https://www.instagram.com/reel/DXglvP5FIFs/   → DXglvP5FIFs
     *   https://www.instagram.com/reels/DXglvP5FIFs/  → DXglvP5FIFs
     *   https://instagram.com/p/ABC123?utm=foo        → ABC123
     * <p>
     * 쿼리스트링/프래그먼트/트레일링 슬래시 제거 후 /p/|/reel/|/reels/ 뒤 세그먼트 반환.
     * 유효하지 않은 URL 이면 null.
     */
    public String extractShortcode(String permalink) {
        if (permalink == null || permalink.isBlank()) return null;
        String cleaned = permalink.trim().split("[?#]")[0];
        if (cleaned.endsWith("/")) cleaned = cleaned.substring(0, cleaned.length() - 1);

        for (String prefix : new String[]{"/p/", "/reel/", "/reels/", "/tv/"}) {
            int idx = cleaned.indexOf(prefix);
            if (idx >= 0) {
                String tail = cleaned.substring(idx + prefix.length());
                int slashIdx = tail.indexOf('/');
                String shortcode = slashIdx < 0 ? tail : tail.substring(0, slashIdx);
                return shortcode.isBlank() ? null : shortcode;
            }
        }
        return null;
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
        String url = "https://graph.instagram.com/v25.0/" + igsid
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
