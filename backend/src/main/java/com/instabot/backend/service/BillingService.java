package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.config.TossPaymentsConfig;
import com.instabot.backend.dto.BillingDto;
import com.instabot.backend.entity.PaymentEvent;
import com.instabot.backend.entity.Subscription;
import com.instabot.backend.entity.Subscription.SubscriptionStatus;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.AutomationRepository;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.MessageRepository;
import com.instabot.backend.repository.PaymentEventRepository;
import com.instabot.backend.repository.SubscriptionRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * 결제/구독 관리 — 토스페이먼츠 정기결제(빌링키) 기반.
 *
 * 흐름
 *   createCheckoutSession   : 프론트가 tossPayments.requestBillingAuth 호출에 쓸 파라미터 생성
 *                             (customerKey + orderId 를 서버가 발급하고 DB 에 임시 저장)
 *   confirmBillingAuth      : 결제창 성공 후 authKey → billingKey 교환 → 첫 결제 실행 → Subscription 저장
 *   cancelAtPeriodEnd       : cancelAtPeriodEnd=true → 스케줄러에서 재결제 제외
 *   renewNow                : 스케줄러가 매일 호출 — /v1/billing/{billingKey} 로 다음 회차 청구
 *   handleWebhook           : 토스에서 결제 상태 변경 알림 수신 (paymentKey 재조회로 pull-verify)
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
    private final PaymentEventRepository paymentEventRepository;
    private final TossPaymentsConfig tossConfig;
    private final TossPaymentsService tossService;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    // ─── Checkout 파라미터 발급 ───

    @Transactional
    public BillingDto.CheckoutResponse createCheckoutSession(Long userId, String planType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        subscriptionRepository.findByUserId(userId).ifPresent(sub -> {
            if (sub.getStatus() == SubscriptionStatus.ACTIVE && !sub.isCancelAtPeriodEnd()) {
                throw new BadRequestException("이미 활성 구독이 있습니다. 변경은 구독 관리에서 진행해주세요.");
            }
        });

        User.PlanType plan = parsePlan(planType);
        long amount = resolveAmount(plan);

        // customerKey 는 한번 발급하면 재활용 가능하지만, 깔끔하게 신규 가입 시 새로 발급.
        String customerKey = "cust_" + userId + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String orderId = "ord_" + userId + "_" + System.currentTimeMillis();
        String orderName = "센드잇 " + plan.name() + " 플랜";

        return BillingDto.CheckoutResponse.builder()
                .clientKey(tossConfig.getClientKey())
                .customerKey(customerKey)
                .orderId(orderId)
                .orderName(orderName)
                .amount(amount)
                .customerEmail(user.getEmail())
                .customerName(user.getName())
                .planType(plan.name())
                .build();
    }

    // ─── 빌링키 발급 + 첫 결제 ───

    @Transactional
    public BillingDto.BillingInfoResponse confirmBillingAuth(Long userId, String authKey, String customerKey,
                                                              String planType, String orderId) {
        // customerKey 소유권 검증 — prefix 에 userId 가 포함되어 있어야 함 (변조 방지).
        if (!customerKey.startsWith("cust_" + userId + "_")) {
            throw new BadRequestException("잘못된 고객 식별자입니다.");
        }
        if (!orderId.startsWith("ord_" + userId + "_")) {
            throw new BadRequestException("주문 소유자가 일치하지 않습니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
        User.PlanType plan = parsePlan(planType);
        long amount = resolveAmount(plan);

        // 1) authKey → billingKey 교환
        JsonNode billingResp = tossService.issueBillingKey(authKey, customerKey);
        String billingKey = billingResp.path("billingKey").asText(null);
        if (billingKey == null || billingKey.isBlank()) {
            throw new BadRequestException("빌링키 발급에 실패했습니다.");
        }
        log.info("빌링키 발급 성공: userId={}, customerKey={}", userId, customerKey);

        // 2) 첫 결제 실행
        String orderName = "센드잇 " + plan.name() + " 플랜";
        JsonNode paymentResp = tossService.chargeWithBillingKey(
                billingKey, customerKey, amount, orderId, orderName,
                user.getEmail(), user.getName());

        String paymentStatus = paymentResp.path("status").asText("");
        if (!"DONE".equalsIgnoreCase(paymentStatus)) {
            throw new BadRequestException("첫 결제가 완료되지 않았습니다: status=" + paymentStatus);
        }
        String paymentKey = paymentResp.path("paymentKey").asText(null);
        long paidAmount = paymentResp.path("totalAmount").asLong(0);
        if (paidAmount != amount) {
            log.warn("결제 금액 불일치: 받은={}, 기대={}", paidAmount, amount);
            throw new BadRequestException("결제 금액이 일치하지 않습니다.");
        }

        // 3) Subscription 저장
        LocalDateTime now = LocalDateTime.now();
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElse(Subscription.builder().userId(userId).build());
        subscription.setTossCustomerKey(customerKey);
        subscription.setTossBillingKey(billingKey);
        subscription.setTossOrderId(orderId);
        subscription.setTossPaymentKey(paymentKey);
        subscription.setPlanType(plan.name());
        subscription.setAmount(paidAmount);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(now.plusMonths(1));
        subscription.setNextPaymentAt(now.plusMonths(1));
        subscription.setCancelAtPeriodEnd(false);
        subscription.setUpdatedAt(now);
        subscriptionRepository.save(subscription);

        // 4) User plan 승급
        user.setPlan(plan);
        user.setUpdatedAt(now);
        userRepository.save(user);

        // 5) 결제 이벤트 기록 — 첫 결제 성공
        recordEvent(userId, subscription.getId(), PaymentEvent.EventType.CHARGE_SUCCESS,
                plan.name(), paidAmount, paymentStatus,
                paymentKey, orderId, null, null, paymentResp);

        notificationService.notify(userId, "BILLING",
                "구독이 활성화되었습니다",
                plan.name() + " 플랜이 활성화되었습니다.",
                "/app/settings");

        return getBillingInfo(userId);
    }

    // ─── 해지 예약 ───

    @Transactional
    public BillingDto.BillingInfoResponse cancelAtPeriodEnd(Long userId) {
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("구독 정보를 찾을 수 없습니다."));
        if (subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            throw new BadRequestException("활성 구독만 해지할 수 있습니다.");
        }
        subscription.setCancelAtPeriodEnd(true);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        recordEvent(userId, subscription.getId(), PaymentEvent.EventType.CANCEL_SCHEDULED,
                subscription.getPlanType(), null, null,
                null, subscription.getTossOrderId(), null,
                "유저 해지 예약 — " + subscription.getCurrentPeriodEnd() + " 이후 FREE 전환", null);

        // 빌링키는 currentPeriodEnd 이후 스케줄러가 정리. 여기서는 플래그만 변경.
        notificationService.notify(userId, "BILLING",
                "구독 해지가 예약되었습니다",
                "현재 결제 주기 종료일 이후에 FREE 플랜으로 전환됩니다.",
                "/app/settings");
        return getBillingInfo(userId);
    }

    // ─── 조회 ───

    @Transactional(readOnly = true)
    public BillingDto.BillingInfoResponse getBillingInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        long flowCount = flowRepository.countByUserId(userId);
        long automationCount = automationRepository.countByUserId(userId);
        long contactCount = contactRepository.countByUserId(userId);
        long monthlyDMCount = messageRepository.countOutboundByUserIdAndSince(userId, getMonthStart());

        Optional<Subscription> subOpt = subscriptionRepository.findByUserId(userId);
        BillingDto.BillingInfoResponse.BillingInfoResponseBuilder b = BillingDto.BillingInfoResponse.builder()
                .plan(user.getPlan().name())
                .flowCount(flowCount)
                .automationCount(automationCount)
                .contactCount(contactCount)
                .monthlyDMCount(monthlyDMCount);
        if (subOpt.isPresent()) {
            Subscription s = subOpt.get();
            b.status(s.getStatus().name())
                    .currentPeriodEnd(s.getCurrentPeriodEnd() != null ? s.getCurrentPeriodEnd().toString() : null)
                    .cancelAtPeriodEnd(s.isCancelAtPeriodEnd());
        } else {
            b.status("NONE").cancelAtPeriodEnd(false);
        }
        return b.build();
    }

    // ─── 정기결제 재호출 (스케줄러에서) ───

    @Transactional
    public void renewNow(Long subscriptionId) {
        Subscription subscription = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("구독을 찾을 수 없습니다."));
        if (subscription.isCancelAtPeriodEnd()) {
            // 해지 예약 — 빌링키 정리 후 FREE 전환.
            markCanceled(subscription, "구독 해지 예약에 따라 FREE 플랜으로 전환되었습니다.");
            return;
        }

        User user = userRepository.findById(subscription.getUserId()).orElse(null);
        if (user == null) {
            log.error("구독의 사용자가 존재하지 않음: subscriptionId={}", subscriptionId);
            return;
        }

        long amount = subscription.getAmount() != null
                ? subscription.getAmount()
                : resolveAmount(User.PlanType.valueOf(subscription.getPlanType()));
        String orderId = "ord_" + subscription.getUserId() + "_" + System.currentTimeMillis();
        String orderName = "센드잇 " + subscription.getPlanType() + " 플랜 정기결제";

        try {
            JsonNode resp = tossService.chargeWithBillingKey(
                    subscription.getTossBillingKey(),
                    subscription.getTossCustomerKey(),
                    amount, orderId, orderName,
                    user.getEmail(), user.getName());
            String status = resp.path("status").asText("");
            if (!"DONE".equalsIgnoreCase(status)) {
                throw new BadRequestException("정기결제 실패: status=" + status);
            }
            LocalDateTime now = LocalDateTime.now();
            String renewedPaymentKey = resp.path("paymentKey").asText(null);
            long renewedAmount = resp.path("totalAmount").asLong(amount);
            subscription.setTossOrderId(orderId);
            subscription.setTossPaymentKey(renewedPaymentKey);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCurrentPeriodStart(now);
            subscription.setCurrentPeriodEnd(now.plusMonths(1));
            subscription.setNextPaymentAt(now.plusMonths(1));
            subscription.setUpdatedAt(now);
            subscriptionRepository.save(subscription);

            recordEvent(subscription.getUserId(), subscription.getId(),
                    PaymentEvent.EventType.CHARGE_SUCCESS,
                    subscription.getPlanType(), renewedAmount, status,
                    renewedPaymentKey, orderId, null, null, resp);

            log.info("정기결제 성공: userId={}, amount={}원", subscription.getUserId(), amount);
        } catch (Exception e) {
            log.error("정기결제 실패 → PAST_DUE: userId={}, err={}",
                    subscription.getUserId(), e.getMessage());
            subscription.setStatus(SubscriptionStatus.PAST_DUE);
            subscription.setUpdatedAt(LocalDateTime.now());
            subscriptionRepository.save(subscription);

            recordEvent(subscription.getUserId(), subscription.getId(),
                    PaymentEvent.EventType.CHARGE_FAILED,
                    subscription.getPlanType(), amount, "FAILED",
                    null, orderId, null, e.getMessage(), null);

            notificationService.notify(subscription.getUserId(), "BILLING",
                    "결제가 실패했습니다",
                    "결제 수단을 확인하고 다시 결제해주세요.",
                    "/app/settings");
        }
    }

    private void markCanceled(Subscription subscription, String message) {
        // 토스는 빌링키 별도 삭제 API 가 없으며, 빌링키 자체가 카드 토큰이므로
        // 재사용하지 않으면 자동으로 만료됨. billingKey/customerKey 필드는 히스토리 목적으로 유지.
        subscription.setStatus(SubscriptionStatus.CANCELED);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        userRepository.findById(subscription.getUserId()).ifPresent(u -> {
            u.setPlan(User.PlanType.FREE);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
        });

        recordEvent(subscription.getUserId(), subscription.getId(),
                PaymentEvent.EventType.CANCELED,
                "FREE", null, null,
                null, subscription.getTossOrderId(), null, message, null);

        notificationService.notify(subscription.getUserId(), "BILLING",
                "구독이 해지되었습니다", message, "/app/settings");
    }

    // ─── Webhook ───

    /**
     * 토스페이먼츠 Webhook — 결제 상태 변경 알림.
     * body 예: { eventType: "PAYMENT_STATUS_CHANGED", data: { paymentKey, status, orderId, ... } }
     *
     * 서명 검증: 토스는 Webhook 에 별도 서명 헤더를 보내지 않으므로 paymentKey 를 API 로 재조회하는
     * pull-verify 패턴을 따른다.
     */
    @Transactional
    public void handleWebhook(String payload) {
        try {
            JsonNode body = objectMapper.readTree(payload);
            String eventType = body.path("eventType").asText("");
            JsonNode data = body.path("data");
            String paymentKey = data.path("paymentKey").asText(null);
            if (paymentKey == null || paymentKey.isBlank()) {
                log.warn("Toss 웹훅에 paymentKey 없음: eventType={}, payload={}", eventType, payload);
                return;
            }
            // pull-verify — API 로 실제 상태 재조회.
            JsonNode payment = tossService.getPayment(paymentKey);
            String status = payment.path("status").asText("");
            String orderId = payment.path("orderId").asText("");

            Optional<Subscription> subOpt = subscriptionRepository.findByTossOrderId(orderId);
            if (subOpt.isEmpty()) {
                log.debug("웹훅 무시 — 매칭되는 구독 없음: orderId={}", orderId);
                return;
            }
            Subscription subscription = subOpt.get();

            switch (status.toUpperCase()) {
                case "DONE" -> {
                    subscription.setStatus(SubscriptionStatus.ACTIVE);
                    subscription.setTossPaymentKey(paymentKey);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                }
                case "ABORTED" -> {
                    subscription.setStatus(SubscriptionStatus.PAST_DUE);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);

                    // 웹훅 멱등성 — 이미 기록된 이벤트면 skip.
                    if (paymentEventRepository.findFirstByTossOrderIdAndEventType(
                            orderId, PaymentEvent.EventType.WEBHOOK_ABORTED).isEmpty()) {
                        recordEvent(subscription.getUserId(), subscription.getId(),
                                PaymentEvent.EventType.WEBHOOK_ABORTED,
                                subscription.getPlanType(), null, status,
                                paymentKey, orderId, null, "Toss 웹훅: ABORTED", payment);
                    }
                }
                case "EXPIRED" -> {
                    subscription.setStatus(SubscriptionStatus.PAST_DUE);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);

                    if (paymentEventRepository.findFirstByTossOrderIdAndEventType(
                            orderId, PaymentEvent.EventType.WEBHOOK_EXPIRED).isEmpty()) {
                        recordEvent(subscription.getUserId(), subscription.getId(),
                                PaymentEvent.EventType.WEBHOOK_EXPIRED,
                                subscription.getPlanType(), null, status,
                                paymentKey, orderId, null, "Toss 웹훅: EXPIRED", payment);
                    }
                }
                case "CANCELED", "PARTIAL_CANCELED" -> {
                    subscription.setStatus(SubscriptionStatus.CANCELED);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                }
                default -> log.debug("처리하지 않는 Toss 상태: {}", status);
            }
        } catch (Exception e) {
            log.error("Toss 웹훅 처리 실패: {}", e.getMessage(), e);
            throw new BadRequestException("Webhook processing failed: " + e.getMessage());
        }
    }

    // ─── 플랜 한도 ───

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

    // ─── Private utilities ───

    private User.PlanType parsePlan(String planType) {
        try {
            User.PlanType p = User.PlanType.valueOf(planType.toUpperCase());
            if (p == User.PlanType.FREE) {
                throw new BadRequestException("유료 플랜만 결제할 수 있습니다.");
            }
            return p;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("유효하지 않은 플랜입니다: " + planType);
        }
    }

    private long resolveAmount(User.PlanType plan) {
        return switch (plan) {
            case STARTER -> tossConfig.getStarterPrice();
            case PRO -> tossConfig.getProPrice();
            case BUSINESS -> tossConfig.getBusinessPrice();
            default -> throw new BadRequestException("결제 불가 플랜: " + plan);
        };
    }

    private LocalDateTime getMonthStart() {
        LocalDateTime now = LocalDateTime.now();
        return now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    }

    // ─── Payment Events (audit log) ───

    /**
     * 결제 이벤트 기록 — 모든 결제/해지/환불 상태 변화는 이 헬퍼로 append-only 저장.
     * subscriptions 테이블은 "현재 상태"만 유지하므로 변경 불가능한 과거 내역은 여기에만 남는다.
     */
    private void recordEvent(Long userId, Long subscriptionId,
                             PaymentEvent.EventType type,
                             String planType, Long amount, String status,
                             String paymentKey, String orderId,
                             String failureCode, String failureReason,
                             JsonNode rawResponse) {
        try {
            paymentEventRepository.save(PaymentEvent.builder()
                    .userId(userId)
                    .subscriptionId(subscriptionId)
                    .eventType(type)
                    .planType(planType)
                    .amount(amount)
                    .status(status)
                    .tossPaymentKey(paymentKey)
                    .tossOrderId(orderId)
                    .failureCode(failureCode)
                    .failureReason(failureReason)
                    .rawResponse(rawResponse != null ? rawResponse.toString() : null)
                    .createdAt(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            // 이벤트 기록 실패가 본 트랜잭션을 깨뜨리면 안 됨 — 로그만 남기고 swallow.
            log.error("결제 이벤트 기록 실패: userId={}, type={}, err={}", userId, type, e.getMessage());
        }
    }

    /** 유저 결제 내역 — 최신순 페이지네이션. */
    @Transactional(readOnly = true)
    public Page<PaymentEvent> listPaymentEvents(Long userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        return paymentEventRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}
