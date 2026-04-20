package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.config.PaddleConfig;
import com.instabot.backend.dto.BillingDto;
import com.instabot.backend.entity.Subscription;
import com.instabot.backend.entity.Subscription.SubscriptionStatus;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.AutomationRepository;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.MessageRepository;
import com.instabot.backend.repository.SubscriptionRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HexFormat;

/**
 * Paddle Billing 서비스.
 * Paddle Billing API (v2) 사용 — REST 기반.
 * 카카오페이, 네이버페이, 삼성페이 등 한국 결제수단 네이티브 지원.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final FlowRepository flowRepository;
    private final AutomationRepository automationRepository;
    private final ContactRepository contactRepository;
    private final MessageRepository messageRepository;
    private final PaddleConfig paddleConfig;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    @Value("${app.base-url}")
    private String baseUrl;

    // ─── Checkout (Paddle Overlay) ───

    /**
     * Paddle은 프론트엔드 Paddle.js 오버레이로 체크아웃을 처리.
     * 백엔드에서는 프론트에 필요한 정보(priceId, clientToken)만 반환.
     */
    public BillingDto.CheckoutResponse createCheckoutSession(Long userId, String planType) {
        if ("BUSINESS".equalsIgnoreCase(planType)) {
            throw new BadRequestException("비즈니스 플랜은 영업팀에 문의해주세요.");
        }

        // 중복 활성 구독 방지
        subscriptionRepository.findByUserId(userId).ifPresent(sub -> {
            if (sub.getStatus() == SubscriptionStatus.ACTIVE) {
                throw new BadRequestException("이미 활성 구독이 있습니다. 구독 관리에서 변경해주세요.");
            }
        });

        String priceId = resolvePriceId(planType);

        // Paddle은 프론트에서 Paddle.js로 오버레이 체크아웃 → 결과를 웹훅으로 수신
        // 백엔드에서는 priceId와 clientToken, customData를 반환
        return BillingDto.CheckoutResponse.builder()
                .checkoutUrl(priceId)  // 프론트에서 Paddle.Checkout.open({ items: [{ priceId }] }) 사용
                .paddleClientToken(paddleConfig.getClientToken())
                .paddleEnvironment(paddleConfig.getEnvironment())
                .build();
    }

    // ─── Customer Portal (Paddle 관리 페이지) ───

    public BillingDto.PortalResponse createPortalSession(Long userId) {
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("구독 정보를 찾을 수 없습니다."));

        if (subscription.getPaddleSubscriptionId() == null) {
            throw new BadRequestException("결제 정보가 없습니다.");
        }

        try {
            // Paddle API: 구독 업데이트 URL 생성
            String url = paddleConfig.getApiBaseUrl()
                    + "/subscriptions/" + subscription.getPaddleSubscriptionId()
                    + "/update-payment-method-transaction";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + paddleConfig.getApiKey())
                    .header("Content-Type", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode body = objectMapper.readTree(response.body());

            // Paddle의 구독 관리 페이지 URL 반환
            // 또는 update-payment-method-transaction 결과의 checkout URL 사용
            String portalUrl = paddleConfig.isSandbox()
                    ? "https://sandbox-buyer-portal.paddle.com/subscriptions/" + subscription.getPaddleSubscriptionId()
                    : "https://customer-portal.paddle.com/subscriptions/" + subscription.getPaddleSubscriptionId();

            return BillingDto.PortalResponse.builder()
                    .portalUrl(portalUrl)
                    .build();
        } catch (Exception e) {
            log.error("Paddle 포털 URL 생성 실패: {}", e.getMessage(), e);
            throw new BadRequestException("포털 세션 생성에 실패했습니다.");
        }
    }

    // ─── 구독 정보 조회 ───

    public BillingDto.BillingInfoResponse getBillingInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        long flowCount = flowRepository.countByUserId(userId);
        long automationCount = automationRepository.countByUserId(userId);
        long contactCount = contactRepository.countByUserId(userId);
        long monthlyDMCount = messageRepository.countOutboundByUserIdAndSince(userId, getMonthStart());

        return subscriptionRepository.findByUserId(userId)
                .map(sub -> BillingDto.BillingInfoResponse.builder()
                        .plan(user.getPlan().name())
                        .status(sub.getStatus().name())
                        .currentPeriodEnd(sub.getCurrentPeriodEnd() != null
                                ? sub.getCurrentPeriodEnd().toString() : null)
                        .cancelAtPeriodEnd(sub.isCancelAtPeriodEnd())
                        .flowCount(flowCount)
                        .automationCount(automationCount)
                        .contactCount(contactCount)
                        .monthlyDMCount(monthlyDMCount)
                        .build())
                .orElse(BillingDto.BillingInfoResponse.builder()
                        .plan(user.getPlan().name())
                        .status("NONE")
                        .cancelAtPeriodEnd(false)
                        .flowCount(flowCount)
                        .automationCount(automationCount)
                        .contactCount(contactCount)
                        .monthlyDMCount(monthlyDMCount)
                        .build());
    }

    // ─── Paddle Webhook 처리 ───

    @Transactional
    public void handleWebhook(String payload, String signature) {
        // Paddle 웹훅 서명 검증
        if (!verifyPaddleSignature(payload, signature)) {
            log.error("Paddle 웹훅 서명 검증 실패");
            throw new BadRequestException("웹훅 서명이 유효하지 않습니다.");
        }

        try {
            JsonNode event = objectMapper.readTree(payload);
            String eventType = event.path("event_type").asText("");
            JsonNode data = event.path("data");

            log.info("Paddle webhook 수신: type={}", eventType);

            switch (eventType) {
                case "subscription.created" -> handleSubscriptionCreated(data);
                case "subscription.updated" -> handleSubscriptionUpdated(data);
                case "subscription.canceled" -> handleSubscriptionCanceled(data);
                case "subscription.paused" -> handleSubscriptionPaused(data);
                case "subscription.resumed" -> handleSubscriptionResumed(data);
                case "transaction.completed" -> handleTransactionCompleted(data);
                case "transaction.payment_failed" -> handlePaymentFailed(data);
                default -> log.debug("처리하지 않는 Paddle 이벤트: {}", eventType);
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paddle 웹훅 처리 실패: {}", e.getMessage(), e);
            throw new RuntimeException("Paddle webhook processing failed", e);
        }
    }

    // ─── Private: Webhook 핸들러 ───

    private void handleSubscriptionCreated(JsonNode data) {
        String paddleSubId = data.path("id").asText();
        String paddleCustomerId = data.path("customer_id").asText();
        String priceId = data.path("items").path(0).path("price").path("id").asText();

        // custom_data에서 userId 추출
        Long userId = extractUserId(data);
        if (userId == null) {
            log.warn("구독 생성 이벤트에 userId 없음: paddleSubId={}", paddleSubId);
            return;
        }

        // 멱등성 — 이미 처리된 경우 스킵
        if (subscriptionRepository.findByPaddleSubscriptionId(paddleSubId)
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE)
                .isPresent()) {
            log.info("이미 처리된 구독 — 스킵: paddleSubId={}", paddleSubId);
            return;
        }

        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElse(Subscription.builder().userId(userId).build());

        subscription.setPaddleCustomerId(paddleCustomerId);
        subscription.setPaddleSubscriptionId(paddleSubId);
        subscription.setPaddlePriceId(priceId);
        subscription.setStatus(mapPaddleStatus(data.path("status").asText("active")));
        subscription.setCurrentPeriodStart(parsePaddleDate(data.path("current_billing_period").path("starts_at").asText(null)));
        subscription.setCurrentPeriodEnd(parsePaddleDate(data.path("current_billing_period").path("ends_at").asText(null)));
        subscription.setCancelAtPeriodEnd(data.path("scheduled_change").has("action")
                && "cancel".equals(data.path("scheduled_change").path("action").asText()));
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        // 사용자 플랜 업데이트
        userRepository.findById(userId).ifPresent(user -> {
            user.setPlan(resolvePlanType(priceId));
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        });

        log.info("Paddle 구독 생성 완료: userId={}, paddleSubId={}", userId, paddleSubId);

        // 구독 활성화 알림
        User.PlanType planType = resolvePlanType(priceId);
        notificationService.notify(userId, "BILLING",
                "구독이 활성화되었습니다",
                planType.name() + " 플랜이 활성화되었습니다.",
                "/app/settings");
    }

    private void handleSubscriptionUpdated(JsonNode data) {
        String paddleSubId = data.path("id").asText();
        subscriptionRepository.findByPaddleSubscriptionId(paddleSubId)
                .ifPresent(subscription -> {
                    String priceId = data.path("items").path(0).path("price").path("id").asText(
                            subscription.getPaddlePriceId());
                    subscription.setStatus(mapPaddleStatus(data.path("status").asText("active")));
                    subscription.setPaddlePriceId(priceId);
                    subscription.setCurrentPeriodStart(parsePaddleDate(
                            data.path("current_billing_period").path("starts_at").asText(null)));
                    subscription.setCurrentPeriodEnd(parsePaddleDate(
                            data.path("current_billing_period").path("ends_at").asText(null)));

                    JsonNode scheduledChange = data.path("scheduled_change");
                    subscription.setCancelAtPeriodEnd(
                            scheduledChange.has("action") && "cancel".equals(scheduledChange.path("action").asText()));

                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);

                    // 플랜 동기화
                    userRepository.findById(subscription.getUserId()).ifPresent(user -> {
                        user.setPlan(resolvePlanType(priceId));
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                    });

                    log.info("Paddle 구독 업데이트: paddleSubId={}, status={}", paddleSubId, subscription.getStatus());
                });
    }

    private void handleSubscriptionCanceled(JsonNode data) {
        String paddleSubId = data.path("id").asText();
        subscriptionRepository.findByPaddleSubscriptionId(paddleSubId)
                .ifPresent(subscription -> {
                    subscription.setStatus(SubscriptionStatus.CANCELED);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);

                    // FREE로 다운그레이드
                    userRepository.findById(subscription.getUserId()).ifPresent(user -> {
                        user.setPlan(User.PlanType.FREE);
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                    });

                    log.info("Paddle 구독 취소 → FREE: userId={}", subscription.getUserId());

                    notificationService.notify(subscription.getUserId(), "BILLING",
                            "구독이 해지되었습니다",
                            "구독이 해지되어 FREE 플랜으로 전환되었습니다.",
                            "/app/settings");
                });
    }

    private void handleSubscriptionPaused(JsonNode data) {
        String paddleSubId = data.path("id").asText();
        subscriptionRepository.findByPaddleSubscriptionId(paddleSubId)
                .ifPresent(subscription -> {
                    subscription.setStatus(SubscriptionStatus.PAUSED);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                    log.info("Paddle 구독 일시정지: paddleSubId={}", paddleSubId);
                });
    }

    private void handleSubscriptionResumed(JsonNode data) {
        String paddleSubId = data.path("id").asText();
        subscriptionRepository.findByPaddleSubscriptionId(paddleSubId)
                .ifPresent(subscription -> {
                    subscription.setStatus(SubscriptionStatus.ACTIVE);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                    log.info("Paddle 구독 재개: paddleSubId={}", paddleSubId);
                });
    }

    private void handleTransactionCompleted(JsonNode data) {
        // 결제 완료 — subscription.created와 함께 오므로 추가 로깅만
        String transactionId = data.path("id").asText();
        log.info("Paddle 결제 완료: transactionId={}", transactionId);
    }

    private void handlePaymentFailed(JsonNode data) {
        String subId = data.path("subscription_id").asText(null);
        if (subId == null) return;

        subscriptionRepository.findByPaddleSubscriptionId(subId)
                .ifPresent(subscription -> {
                    subscription.setStatus(SubscriptionStatus.PAST_DUE);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                    log.warn("Paddle 결제 실패 → PAST_DUE: userId={}", subscription.getUserId());
                });
    }

    // ─── Private: 유틸리티 ───

    private Long extractUserId(JsonNode data) {
        // custom_data에서 userId 추출
        JsonNode customData = data.path("custom_data");
        if (customData.has("userId")) {
            return customData.path("userId").asLong();
        }
        // passthrough에서도 시도
        String passthrough = data.path("passthrough").asText(null);
        if (passthrough != null) {
            try {
                JsonNode pt = objectMapper.readTree(passthrough);
                return pt.path("userId").asLong();
            } catch (Exception ignored) {}
        }
        return null;
    }

    private boolean verifyPaddleSignature(String payload, String signature) {
        if (signature == null || signature.isBlank()) return false;
        try {
            // Paddle Billing v2: ts=...;h1=... 형식
            String[] parts = signature.split(";");
            String ts = null;
            String h1 = null;
            for (String part : parts) {
                if (part.startsWith("ts=")) ts = part.substring(3);
                else if (part.startsWith("h1=")) h1 = part.substring(3);
            }
            if (ts == null || h1 == null) return false;

            String signedPayload = ts + ":" + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(paddleConfig.getWebhookSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);

            return computed.equals(h1);
        } catch (Exception e) {
            log.error("Paddle 서명 검증 오류: {}", e.getMessage());
            return false;
        }
    }

    private String resolvePriceId(String planType) {
        return switch (planType.toUpperCase()) {
            case "STARTER" -> paddleConfig.getStarterPriceId();
            case "PRO" -> paddleConfig.getProPriceId();
            case "BUSINESS" -> paddleConfig.getBusinessPriceId();
            default -> throw new BadRequestException("유효하지 않은 플랜입니다: " + planType);
        };
    }

    private User.PlanType resolvePlanType(String priceId) {
        if (priceId != null && priceId.equals(paddleConfig.getStarterPriceId())) {
            return User.PlanType.STARTER;
        } else if (priceId != null && priceId.equals(paddleConfig.getProPriceId())) {
            return User.PlanType.PRO;
        } else if (priceId != null && priceId.equals(paddleConfig.getBusinessPriceId())) {
            return User.PlanType.BUSINESS;
        }
        return User.PlanType.FREE;
    }

    private SubscriptionStatus mapPaddleStatus(String paddleStatus) {
        return switch (paddleStatus) {
            case "active" -> SubscriptionStatus.ACTIVE;
            case "canceled" -> SubscriptionStatus.CANCELED;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "trialing" -> SubscriptionStatus.TRIALING;
            case "paused" -> SubscriptionStatus.PAUSED;
            default -> SubscriptionStatus.PAST_DUE;
        };
    }

    /**
     * DM 발송 한도 초과 여부 확인
     */
    public boolean canSendDM(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return false;
        long monthlyDMCount = messageRepository.countOutboundByUserIdAndSince(userId, getMonthStart());
        long limit = getDMLimit(user.getPlan());
        return monthlyDMCount < limit;
    }

    private long getDMLimit(User.PlanType plan) {
        return switch (plan) {
            case FREE -> 300;
            case STARTER -> 3000;
            case PRO -> 30000;
            case BUSINESS -> Long.MAX_VALUE;
        };
    }

    private LocalDateTime getMonthStart() {
        LocalDateTime now = LocalDateTime.now();
        return now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    }

    private LocalDateTime parsePaddleDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return OffsetDateTime.parse(dateStr).toLocalDateTime();
        } catch (Exception e) {
            return null;
        }
    }
}
