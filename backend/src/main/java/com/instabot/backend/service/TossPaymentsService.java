package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.instabot.backend.config.TossPaymentsConfig;
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
import java.util.Base64;

/**
 * 토스페이먼츠 REST API 래퍼.
 *
 *  - 인증: HTTP Basic — Authorization: Basic base64(secretKey + ":")  ← 콜론 필수, 비밀번호 없음.
 *  - 빌링키 발급:          POST /v1/billing/authorizations/issue  (authKey → billingKey)
 *  - 빌링키로 결제:        POST /v1/billing/{billingKey}
 *  - 결제 단건 조회:       GET  /v1/payments/{paymentKey}
 *  - 결제 취소/환불:       POST /v1/payments/{paymentKey}/cancel
 *
 * 응답 형식은 성공 시 그대로 JSON, 실패 시 { code, message } 반환.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TossPaymentsService {

    private final TossPaymentsConfig config;
    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // ─── 빌링키 발급 ───

    /**
     * 프론트에서 requestBillingAuth 성공 콜백으로 받은 authKey 를 billingKey 로 교환.
     *
     * @param authKey     successUrl 쿼리로 받은 1회용 인증 키
     * @param customerKey 프론트 SDK 초기화 시 전달한 고객 식별자 (userId 기반 UUID)
     * @return 토스 API 응답 (billingKey, cardNumber, cardCompany 등 포함)
     */
    public JsonNode issueBillingKey(String authKey, String customerKey) {
        ObjectNode body = objectMapper.createObjectNode()
                .put("authKey", authKey)
                .put("customerKey", customerKey);
        return call("POST", "/v1/billing/authorizations/issue", body);
    }

    // ─── 정기결제 ───

    /**
     * 저장된 빌링키로 즉시 결제.
     *
     * @param billingKey  issueBillingKey 로 받은 키
     * @param customerKey 빌링키 발급 시 사용한 customerKey (일치해야 함)
     * @param amount      청구 금액(원)
     * @param orderId     이번 회차 주문 고유 ID (6~64자)
     * @param orderName   결제창/영수증 표시용 상품명
     * @param customerEmail 영수증 발송용 이메일
     * @param customerName  주문자명
     */
    public JsonNode chargeWithBillingKey(String billingKey, String customerKey, long amount,
                                         String orderId, String orderName,
                                         String customerEmail, String customerName) {
        ObjectNode body = objectMapper.createObjectNode()
                .put("customerKey", customerKey)
                .put("amount", amount)
                .put("orderId", orderId)
                .put("orderName", orderName);
        if (customerEmail != null) body.put("customerEmail", customerEmail);
        if (customerName != null)  body.put("customerName", customerName);
        return call("POST", "/v1/billing/" + billingKey, body);
    }

    // ─── 결제 조회 ───

    public JsonNode getPayment(String paymentKey) {
        return call("GET", "/v1/payments/" + paymentKey, null);
    }

    // ─── 결제 취소/환불 ───

    public JsonNode cancelPayment(String paymentKey, String cancelReason) {
        ObjectNode body = objectMapper.createObjectNode()
                .put("cancelReason", cancelReason);
        return call("POST", "/v1/payments/" + paymentKey + "/cancel", body);
    }

    // ─── HTTP 유틸 ───

    private String basicAuthHeader() {
        // 토스는 secretKey 뒤에 콜론만 붙여 base64 인코딩 — 비밀번호 필드는 비워둠.
        String raw = config.getSecretKey() + ":";
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private JsonNode call(String method, String path, JsonNode body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(config.getApiBaseUrl() + path))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", basicAuthHeader())
                    .header("Content-Type", "application/json");

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

            // 토스는 에러 시 { code: "ERROR_CODE", message: "..." } 형태 반환.
            if (response.statusCode() >= 400) {
                String code = json.path("code").asText("UNKNOWN");
                String msg = json.path("message").asText("토스페이먼츠 호출 실패");
                log.error("Toss {} {} → HTTP {}, code={}, message={}", method, path, response.statusCode(), code, msg);
                throw new BadRequestException("결제 오류 (" + code + "): " + msg);
            }
            return json;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Toss 호출 예외 {} {}: {}", method, path, e.getMessage(), e);
            throw new BadRequestException("결제 통신 실패: " + e.getMessage());
        }
    }
}
