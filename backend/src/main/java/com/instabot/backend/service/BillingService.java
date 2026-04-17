package com.instabot.backend.service;

import com.instabot.backend.config.StripeConfig;
import com.instabot.backend.dto.BillingDto;
import com.instabot.backend.entity.Subscription;
import com.instabot.backend.entity.Subscription.SubscriptionStatus;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.AutomationRepository;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.SubscriptionRepository;
import com.instabot.backend.repository.UserRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final FlowRepository flowRepository;
    private final AutomationRepository automationRepository;
    private final ContactRepository contactRepository;
    private final StripeConfig stripeConfig;

    @Value("${app.base-url}")
    private String baseUrl;

    // ─── Checkout 세션 생성 ───

    @Transactional
    public BillingDto.CheckoutResponse createCheckoutSession(Long userId, String planType) {
        if ("ENTERPRISE".equalsIgnoreCase(planType)) {
            throw new BadRequestException("엔터프라이즈 플랜은 영업팀에 문의해주세요.");
        }

        // Fix #4: 중복 활성 구독 방지
        subscriptionRepository.findByUserId(userId).ifPresent(sub -> {
            if (sub.getStatus() == SubscriptionStatus.ACTIVE) {
                throw new BadRequestException("이미 활성 구독이 있습니다. 구독 관리 포털을 이용해주세요.");
            }
        });

        String priceId = resolvePriceId(planType);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        try {
            String customerId = getOrCreateStripeCustomer(user);

            com.stripe.param.checkout.SessionCreateParams params =
                    com.stripe.param.checkout.SessionCreateParams.builder()
                            .setCustomer(customerId)
                            .setMode(com.stripe.param.checkout.SessionCreateParams.Mode.SUBSCRIPTION)
                            .setSuccessUrl(baseUrl + "/app/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}")
                            .setCancelUrl(baseUrl + "/app/settings?tab=billing")
                            .addLineItem(
                                    com.stripe.param.checkout.SessionCreateParams.LineItem.builder()
                                            .setPrice(priceId)
                                            .setQuantity(1L)
                                            .build()
                            )
                            .putMetadata("userId", userId.toString())
                            .build();

            Session session = Session.create(params);
            log.info("Checkout 세션 생성: userId={}, sessionId={}", userId, session.getId());

            return BillingDto.CheckoutResponse.builder()
                    .checkoutUrl(session.getUrl())
                    .build();
        } catch (StripeException e) {
            log.error("Stripe checkout 세션 생성 실패: {}", e.getMessage(), e);
            throw new BadRequestException("결제 세션 생성에 실패했습니다: " + e.getMessage());
        }
    }

    // ─── Customer Portal 세션 ───

    public BillingDto.PortalResponse createPortalSession(Long userId) {
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("구독 정보를 찾을 수 없습니다."));

        if (subscription.getStripeCustomerId() == null) {
            throw new BadRequestException("Stripe 고객 정보가 없습니다.");
        }

        try {
            com.stripe.param.billingportal.SessionCreateParams params =
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                            .setCustomer(subscription.getStripeCustomerId())
                            .setReturnUrl(baseUrl + "/app/settings?tab=billing")
                            .build();

            com.stripe.model.billingportal.Session portalSession =
                    com.stripe.model.billingportal.Session.create(params);

            return BillingDto.PortalResponse.builder()
                    .portalUrl(portalSession.getUrl())
                    .build();
        } catch (StripeException e) {
            log.error("Portal 세션 생성 실패: {}", e.getMessage(), e);
            throw new BadRequestException("포털 세션 생성에 실패했습니다: " + e.getMessage());
        }
    }

    // ─── 구독 정보 조회 ───

    public BillingDto.BillingInfoResponse getBillingInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // S5/S16 fix: usage 카운트 포함 — 프론트 PlanContext가 isAtLimit() 판정에 사용
        long flowCount = flowRepository.countByUserId(userId);
        long automationCount = automationRepository.countByUserId(userId);
        long contactCount = contactRepository.countByUserId(userId);

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
                        .build())
                .orElse(BillingDto.BillingInfoResponse.builder()
                        .plan(user.getPlan().name())
                        .status("NONE")
                        .cancelAtPeriodEnd(false)
                        .flowCount(flowCount)
                        .automationCount(automationCount)
                        .contactCount(contactCount)
                        .build());
    }

    // ─── Webhook 처리 ───

    @Transactional
    public void handleWebhook(String payload, String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, stripeConfig.getWebhookSecret());
        } catch (SignatureVerificationException e) {
            log.error("Webhook 서명 검증 실패: {}", e.getMessage());
            throw new BadRequestException("Webhook 서명이 유효하지 않습니다.");
        }

        log.info("Stripe webhook 수신: type={}, id={}", event.getType(), event.getId());

        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        if (deserializer.getObject().isEmpty()) {
            log.warn("Webhook 데이터 역직렬화 실패: eventId={}", event.getId());
            return;
        }

        StripeObject stripeObject = deserializer.getObject().get();

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutCompleted((Session) stripeObject);
            case "customer.subscription.updated" -> handleSubscriptionUpdated((com.stripe.model.Subscription) stripeObject);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted((com.stripe.model.Subscription) stripeObject);
            case "invoice.payment_failed" -> handlePaymentFailed((Invoice) stripeObject);
            default -> log.debug("처리하지 않는 webhook 이벤트: {}", event.getType());
        }
    }

    // ─── Private: Webhook 핸들러 ───

    private void handleCheckoutCompleted(Session session) {
        String stripeSubscriptionId = session.getSubscription();
        String stripeCustomerId = session.getCustomer();
        String userIdStr = session.getMetadata().get("userId");

        if (userIdStr == null) {
            log.warn("Checkout 세션에 userId 메타데이터 없음: sessionId={}", session.getId());
            return;
        }

        Long userId = Long.valueOf(userIdStr);

        // Fix #2: 멱등성 — 이미 동일 stripeSubscriptionId로 처리된 경우 스킵
        if (subscriptionRepository.findByStripeSubscriptionId(stripeSubscriptionId)
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE)
                .isPresent()) {
            log.info("이미 처리된 구독 — 스킵: stripeSubscriptionId={}", stripeSubscriptionId);
            return;
        }

        try {
            com.stripe.model.Subscription stripeSub =
                    com.stripe.model.Subscription.retrieve(stripeSubscriptionId);

            Subscription subscription = subscriptionRepository.findByUserId(userId)
                    .orElse(Subscription.builder().userId(userId).build());

            subscription.setStripeCustomerId(stripeCustomerId);
            subscription.setStripeSubscriptionId(stripeSubscriptionId);
            subscription.setStripePriceId(stripeSub.getItems().getData().get(0).getPrice().getId());
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCurrentPeriodStart(toLocalDateTime(stripeSub.getCurrentPeriodStart()));
            subscription.setCurrentPeriodEnd(toLocalDateTime(stripeSub.getCurrentPeriodEnd()));
            subscription.setCancelAtPeriodEnd(stripeSub.getCancelAtPeriodEnd());
            subscription.setUpdatedAt(LocalDateTime.now());

            subscriptionRepository.save(subscription);

            // 사용자 플랜 업데이트
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                user.setPlan(resolvePlanType(subscription.getStripePriceId()));
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
            }

            log.info("구독 생성/업데이트 완료: userId={}, plan={}", userId,
                    user != null ? user.getPlan() : "unknown");
        } catch (StripeException e) {
            // Fix #1: 예외를 다시 던져 webhook이 non-200 반환하도록 → Stripe 재시도 유도
            log.error("Stripe 구독 조회 실패: {}", e.getMessage(), e);
            throw new RuntimeException("Stripe subscription retrieval failed", e);
        }
    }

    private void handleSubscriptionUpdated(com.stripe.model.Subscription stripeSub) {
        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId())
                .ifPresent(subscription -> {
                    subscription.setStatus(mapStripeStatus(stripeSub.getStatus()));
                    subscription.setCurrentPeriodStart(toLocalDateTime(stripeSub.getCurrentPeriodStart()));
                    subscription.setCurrentPeriodEnd(toLocalDateTime(stripeSub.getCurrentPeriodEnd()));
                    subscription.setCancelAtPeriodEnd(stripeSub.getCancelAtPeriodEnd());
                    subscription.setStripePriceId(
                            stripeSub.getItems().getData().get(0).getPrice().getId());
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);

                    // 사용자 플랜 동기화
                    userRepository.findById(subscription.getUserId()).ifPresent(user -> {
                        user.setPlan(resolvePlanType(subscription.getStripePriceId()));
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                    });

                    log.info("구독 업데이트: subscriptionId={}, status={}",
                            stripeSub.getId(), subscription.getStatus());
                });
    }

    private void handleSubscriptionDeleted(com.stripe.model.Subscription stripeSub) {
        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId())
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

                    log.info("구독 삭제 -> FREE 다운그레이드: userId={}", subscription.getUserId());
                });
    }

    private void handlePaymentFailed(Invoice invoice) {
        String subscriptionId = invoice.getSubscription();
        if (subscriptionId == null) return;

        subscriptionRepository.findByStripeSubscriptionId(subscriptionId)
                .ifPresent(subscription -> {
                    subscription.setStatus(SubscriptionStatus.PAST_DUE);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);

                    log.warn("결제 실패 -> PAST_DUE: userId={}, subscriptionId={}",
                            subscription.getUserId(), subscriptionId);
                });
    }

    // ─── Private: 유틸리티 ───

    private String getOrCreateStripeCustomer(User user) throws StripeException {
        // 기존 구독에서 customerId 확인
        return subscriptionRepository.findByUserId(user.getId())
                .map(Subscription::getStripeCustomerId)
                .filter(id -> id != null && !id.isEmpty())
                .orElseGet(() -> {
                    try {
                        CustomerCreateParams params = CustomerCreateParams.builder()
                                .setEmail(user.getEmail())
                                .setName(user.getName())
                                .putMetadata("userId", user.getId().toString())
                                .build();
                        Customer customer = Customer.create(params);
                        log.info("Stripe 고객 생성: userId={}, customerId={}", user.getId(), customer.getId());

                        // Fix #3: 생성된 customerId를 즉시 저장
                        Subscription sub = subscriptionRepository.findByUserId(user.getId())
                                .orElse(Subscription.builder()
                                        .userId(user.getId())
                                        .status(SubscriptionStatus.INCOMPLETE)
                                        .build());
                        sub.setStripeCustomerId(customer.getId());
                        sub.setUpdatedAt(LocalDateTime.now());
                        subscriptionRepository.save(sub);

                        return customer.getId();
                    } catch (StripeException e) {
                        log.error("Stripe 고객 생성 실패: {}", e.getMessage(), e);
                        throw new RuntimeException("Stripe 고객 생성에 실패했습니다.", e);
                    }
                });
    }

    private String resolvePriceId(String planType) {
        return switch (planType.toUpperCase()) {
            case "PRO" -> stripeConfig.getProPriceId();
            case "ENTERPRISE" -> stripeConfig.getEnterprisePriceId();
            default -> throw new BadRequestException("유효하지 않은 플랜입니다: " + planType);
        };
    }

    private User.PlanType resolvePlanType(String priceId) {
        if (priceId.equals(stripeConfig.getProPriceId())) {
            return User.PlanType.PRO;
        } else if (priceId.equals(stripeConfig.getEnterprisePriceId())) {
            return User.PlanType.ENTERPRISE;
        }
        return User.PlanType.FREE;
    }

    private SubscriptionStatus mapStripeStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "active" -> SubscriptionStatus.ACTIVE;
            case "canceled" -> SubscriptionStatus.CANCELED;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "trialing" -> SubscriptionStatus.TRIALING;
            default -> SubscriptionStatus.PAST_DUE;
        };
    }

    private LocalDateTime toLocalDateTime(Long epochSeconds) {
        if (epochSeconds == null) return null;
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneId.of("Asia/Seoul"));
    }
}
