package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.config.PortoneConfig;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 결제/구독 관리 — Portone V1 + danal_tpay 정기결제 기반.
 *
 * Paddle 모델과의 근본 차이: PG 가 자동 갱신하지 않으므로 서버가 "빌링키 저장 → 매월 재결제" 루프를 직접 돌린다.
 *
 * 흐름
 *   createCheckout       : 프론트가 IMP.request_pay 호출에 쓸 파라미터 생성
 *   confirmPayment       : 프론트 결제 완료 콜백에서 서버가 imp_uid 검증 후 Subscription 저장
 *   cancelSubscription   : cancelAtPeriodEnd=true → 스케줄러에서 재결제 제외
 *   renewNow             : 스케줄러가 호출 — /subscribe/payments/again
 *   handleWebhook        : Portone 에서 결제 완료/실패 알림 수신
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
    private final PortoneConfig portoneConfig;
    private final PortoneService portoneService;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    // ─── Checkout 파라미터 ───

    @Transactional(readOnly = true)
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
        long ts = System.currentTimeMillis();
        String merchantUid = "ord_" + userId + "_" + ts;
        String customerUid = "cus_" + userId + "_" + ts;
        String productName = "센드잇 " + plan.name() + " 플랜";

        return BillingDto.CheckoutResponse.builder()
                .impCode(portoneConfig.getImpCode())
                .pg(portoneConfig.getPgString())
                .payMethod("card")
                .merchantUid(merchantUid)
                .customerUid(customerUid)
                .amount(amount)
                .name(productName)
                .buyerEmail(user.getEmail())
                .buyerName(user.getName())
                .build();
    }

    // ─── 결제 검증 및 구독 생성 ───

    @Transactional
    public BillingDto.BillingInfoResponse confirmPayment(Long userId, String impUid, String merchantUid) {
        JsonNode payment = portoneService.getPayment(impUid);
        if (payment.isMissingNode() || payment.isNull()) {
            throw new BadRequestException("결제 정보를 찾을 수 없습니다.");
        }

        String status = payment.path("status").asText("");
        long paidAmount = payment.path("amount").asLong(0);
        String respMerchantUid = payment.path("merchant_uid").asText("");
        String customerUid = payment.path("customer_uid").asText(null);

        if (!"paid".equalsIgnoreCase(status)) {
            throw new BadRequestException("결제가 완료되지 않았습니다: status=" + status);
        }
        if (!merchantUid.equals(respMerchantUid)) {
            throw new BadRequestException("주문 ID가 일치하지 않습니다.");
        }

        // merchantUid 에서 userId 파싱해 이중 확인 (변조 방지).
        if (!merchantUid.startsWith("ord_" + userId + "_")) {
            throw new BadRequestException("주문 소유자가 일치하지 않습니다.");
        }

        User.PlanType planType = deducePlanFromAmount(paidAmount);
        long expectedAmount = resolveAmount(planType);
        if (paidAmount != expectedAmount) {
            log.warn("결제 금액 불일치: 받은={}, 기대={}", paidAmount, expectedAmount);
            throw new BadRequestException("결제 금액이 일치하지 않습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElse(Subscription.builder().userId(userId).build());
        subscription.setPortoneCustomerUid(customerUid);
        subscription.setPortoneMerchantUid(merchantUid);
        subscription.setPortoneImpUid(impUid);
        subscription.setPlanType(planType.name());
        subscription.setAmount(paidAmount);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(now.plusMonths(1));
        subscription.setNextPaymentAt(now.plusMonths(1));
        subscription.setCancelAtPeriodEnd(false);
        subscription.setUpdatedAt(now);
        subscriptionRepository.save(subscription);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
        user.setPlan(planType);
        user.setUpdatedAt(now);
        userRepository.save(user);

        notificationService.notify(userId, "BILLING",
                "구독이 활성화되었습니다",
                planType.name() + " 플랜이 활성화되었습니다.",
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

        // 빌링키는 currentPeriodEnd 이후 정리. 여기서는 다음 재결제를 skip 하도록 플래그만.
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
            // 해지 예약 — 빌링키 정리하고 FREE 로 전환.
            markCanceled(subscription, "구독 해지 예약에 따라 FREE 플랜으로 전환되었습니다.");
            return;
        }

        long amount = subscription.getAmount() != null
                ? subscription.getAmount()
                : resolveAmount(User.PlanType.valueOf(subscription.getPlanType()));
        long ts = System.currentTimeMillis();
        String merchantUid = "ord_" + subscription.getUserId() + "_" + ts;
        String name = "센드잇 " + subscription.getPlanType() + " 플랜 정기결제";

        try {
            JsonNode resp = portoneService.requestAgain(
                    subscription.getPortoneCustomerUid(), merchantUid, amount, name);
            String status = resp.path("status").asText("");
            if (!"paid".equalsIgnoreCase(status)) {
                throw new BadRequestException("정기결제 실패: status=" + status);
            }
            LocalDateTime now = LocalDateTime.now();
            subscription.setPortoneMerchantUid(merchantUid);
            subscription.setPortoneImpUid(resp.path("imp_uid").asText(null));
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCurrentPeriodStart(now);
            subscription.setCurrentPeriodEnd(now.plusMonths(1));
            subscription.setNextPaymentAt(now.plusMonths(1));
            subscription.setUpdatedAt(now);
            subscriptionRepository.save(subscription);
            log.info("정기결제 성공: userId={}, amount={}원", subscription.getUserId(), amount);
        } catch (Exception e) {
            log.error("정기결제 실패 → PAST_DUE: userId={}, err={}",
                    subscription.getUserId(), e.getMessage());
            subscription.setStatus(SubscriptionStatus.PAST_DUE);
            subscription.setUpdatedAt(LocalDateTime.now());
            subscriptionRepository.save(subscription);
            notificationService.notify(subscription.getUserId(), "BILLING",
                    "결제가 실패했습니다",
                    "결제 수단을 확인하고 다시 결제해주세요.",
                    "/app/settings");
        }
    }

    private void markCanceled(Subscription subscription, String message) {
        if (subscription.getPortoneCustomerUid() != null) {
            portoneService.deleteBillingKey(subscription.getPortoneCustomerUid());
        }
        subscription.setStatus(SubscriptionStatus.CANCELED);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        userRepository.findById(subscription.getUserId()).ifPresent(u -> {
            u.setPlan(User.PlanType.FREE);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
        });
        notificationService.notify(subscription.getUserId(), "BILLING",
                "구독이 해지되었습니다", message, "/app/settings");
    }

    // ─── Webhook ───

    /**
     * Portone Webhook — body 예: { imp_uid, merchant_uid, status }.
     * 서명 검증: Portone 은 v1 에서 HMAC 필드를 기본 제공하지 않으므로 imp_uid 를 API 로 재조회하는
     * "풀(pull) 검증" 패턴을 따른다.
     */
    @Transactional
    public void handleWebhook(String payload) {
        try {
            JsonNode body = objectMapper.readTree(payload);
            String impUid = body.path("imp_uid").asText(null);
            if (impUid == null || impUid.isBlank()) {
                log.warn("Portone 웹훅에 imp_uid 없음: {}", payload);
                return;
            }
            JsonNode payment = portoneService.getPayment(impUid);
            String status = payment.path("status").asText("");
            String merchantUid = payment.path("merchant_uid").asText("");

            Optional<Subscription> subOpt = subscriptionRepository.findByPortoneMerchantUid(merchantUid);
            if (subOpt.isEmpty()) {
                log.debug("웹훅 무시 — 매칭되는 구독 없음: merchantUid={}", merchantUid);
                return;
            }
            Subscription subscription = subOpt.get();

            switch (status.toLowerCase()) {
                case "paid" -> {
                    subscription.setStatus(SubscriptionStatus.ACTIVE);
                    subscription.setPortoneImpUid(impUid);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                }
                case "failed" -> {
                    subscription.setStatus(SubscriptionStatus.PAST_DUE);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                }
                case "cancelled", "canceled" -> {
                    subscription.setStatus(SubscriptionStatus.CANCELED);
                    subscription.setUpdatedAt(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                }
                default -> log.debug("처리하지 않는 Portone 상태: {}", status);
            }
        } catch (Exception e) {
            log.error("Portone 웹훅 처리 실패: {}", e.getMessage(), e);
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
            case STARTER -> portoneConfig.getStarterPrice();
            case PRO -> portoneConfig.getProPrice();
            case BUSINESS -> portoneConfig.getBusinessPrice();
            default -> throw new BadRequestException("결제 불가 플랜: " + plan);
        };
    }

    private User.PlanType deducePlanFromAmount(long amount) {
        if (amount == portoneConfig.getStarterPrice()) return User.PlanType.STARTER;
        if (amount == portoneConfig.getProPrice()) return User.PlanType.PRO;
        if (amount == portoneConfig.getBusinessPrice()) return User.PlanType.BUSINESS;
        throw new BadRequestException("결제 금액에 해당하는 플랜이 없습니다: " + amount);
    }

    private LocalDateTime getMonthStart() {
        LocalDateTime now = LocalDateTime.now();
        return now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    }
}
