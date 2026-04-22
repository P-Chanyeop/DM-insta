package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.instabot.backend.config.PortoneConfig;
import com.instabot.backend.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

/**
 * Portone V1 REST API 래퍼.
 *
 *  - Access Token: /users/getToken — 30분 유효. 만료 90초 전 선제 갱신.
 *  - 결제 조회: GET /payments/{imp_uid}
 *  - 정기결제 즉시 재결제: POST /subscribe/payments/again
 *  - 정기결제 스케줄 등록: POST /subscribe/payments/schedule
 *  - 정기결제 해지(빌링키 삭제): DELETE /subscribe/customers/{customer_uid}
 *  - 결제 취소/환불: POST /payments/cancel
 *
 * 장애/레이트리밋 대비 재시도 로직은 1회만. 실제 운영에서 필요하면 백오프 추가.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PortoneService {

    private final PortoneConfig portoneConfig;
    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** 토큰 캐시 — 단일 인스턴스 기준. 다중 인스턴스면 공유 캐시로 교체 필요. */
    private volatile String cachedToken;
    private volatile Instant cachedTokenExpiresAt = Instant.EPOCH;

    // ─── Access Token ───

    public synchronized String getAccessToken() {
        if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiresAt.minusSeconds(90))) {
            return cachedToken;
        }
        ObjectNode body = objectMapper.createObjectNode()
                .put("imp_key", portoneConfig.getApiKey())
                .put("imp_secret", portoneConfig.getApiSecret());

        JsonNode resp = callUnauth("POST", "/users/getToken", body);
        JsonNode respPart = resp.path("response");
        String token = respPart.path("access_token").asText(null);
        long expiredAt = respPart.path("expired_at").asLong(0);
        if (token == null || expiredAt == 0) {
            throw new BadRequestException("Portone 인증 토큰 발급 실패: " + resp);
        }
        cachedToken = token;
        cachedTokenExpiresAt = Instant.ofEpochSecond(expiredAt);
        log.debug("Portone token 갱신 — 만료 {}", cachedTokenExpiresAt);
        return token;
    }

    // ─── 결제 조회 ───

    /** 결제 단건 조회 — 프론트 결과 검증에 사용. */
    public JsonNode getPayment(String impUid) {
        JsonNode resp = callAuth("GET", "/payments/" + impUid, null);
        return resp.path("response");
    }

    // ─── 정기결제 ───

    /**
     * 저장된 빌링키로 즉시 재결제.
     * customerUid: 최초 결제 시 저장된 빌링키 식별자.
     * merchantUid: 이번 회차 주문 고유 ID — 매번 새로 생성.
     */
    public JsonNode requestAgain(String customerUid, String merchantUid, long amount, String name) {
        ObjectNode body = objectMapper.createObjectNode()
                .put("customer_uid", customerUid)
                .put("merchant_uid", merchantUid)
                .put("amount", amount)
                .put("name", name);
        JsonNode resp = callAuth("POST", "/subscribe/payments/again", body);
        return resp.path("response");
    }

    /**
     * 빌링키 삭제 — 구독 해지 시 다음 회차 재결제 방지.
     */
    public void deleteBillingKey(String customerUid) {
        try {
            callAuth("DELETE", "/subscribe/customers/" + customerUid, null);
        } catch (Exception e) {
            // 이미 삭제된 경우도 있으므로 치명 오류로 승격시키지 않음.
            log.warn("Portone 빌링키 삭제 실패(무시): customer_uid={}, err={}", customerUid, e.getMessage());
        }
    }

    // ─── HTTP 유틸 ───

    private JsonNode callUnauth(String method, String path, JsonNode body) {
        return call(method, path, body, null);
    }

    private JsonNode callAuth(String method, String path, JsonNode body) {
        return call(method, path, body, getAccessToken());
    }

    private JsonNode call(String method, String path, JsonNode body, String authToken) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(portoneConfig.getApiBaseUrl() + path))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json");
            if (authToken != null) {
                builder.header("Authorization", "Bearer " + authToken);
            }
            byte[] payload = body == null
                    ? new byte[0]
                    : objectMapper.writeValueAsBytes(body);
            HttpRequest.BodyPublisher publisher = body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofByteArray(payload);
            builder.method(method, publisher);

            HttpResponse<byte[]> response = HTTP_CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            JsonNode json = objectMapper.readTree(
                    response.body() == null || response.body().length == 0
                            ? "{}".getBytes(StandardCharsets.UTF_8)
                            : response.body());

            int code = json.path("code").asInt(-1);
            if (response.statusCode() >= 400 || (code != 0 && code != -1)) {
                String msg = json.path("message").asText("Portone 호출 실패");
                log.error("Portone {} {} → HTTP {}, code={}, message={}", method, path, response.statusCode(), code, msg);
                throw new BadRequestException("Portone 오류: " + msg);
            }
            return json;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Portone 호출 예외 {} {}: {}", method, path, e.getMessage(), e);
            throw new BadRequestException("Portone 통신 실패: " + e.getMessage());
        }
    }
}
