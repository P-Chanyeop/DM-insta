package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.BillingDto;
import com.instabot.backend.entity.PaymentEvent;
import com.instabot.backend.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    /**
     * 프론트에 tossPayments.requestBillingAuth() 에 필요한 파라미터 반환.
     * customerKey/orderId 를 서버가 발급해 위변조 방지.
     */
    @PostMapping("/checkout")
    public ResponseEntity<BillingDto.CheckoutResponse> createCheckout(
            @Valid @RequestBody BillingDto.CreateCheckoutRequest request) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.createCheckoutSession(userId, request.getPlanType()));
    }

    /**
     * 토스 결제창 successUrl 콜백에서 authKey 전달 받아
     * → billingKey 교환 → 첫 결제 → Subscription 저장.
     */
    @PostMapping("/confirm")
    public ResponseEntity<BillingDto.BillingInfoResponse> confirmBillingAuth(
            @Valid @RequestBody BillingDto.ConfirmBillingAuthRequest request) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.confirmBillingAuth(
                userId, request.getAuthKey(), request.getCustomerKey(),
                request.getPlanType(), request.getOrderId()));
    }

    /** 구독 해지 예약 — 현재 결제 주기 끝에 FREE 로 전환. */
    @PostMapping("/cancel")
    public ResponseEntity<BillingDto.BillingInfoResponse> cancelSubscription() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.cancelAtPeriodEnd(userId));
    }

    @GetMapping("/info")
    public ResponseEntity<BillingDto.BillingInfoResponse> getBillingInfo() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.getBillingInfo(userId));
    }

    /**
     * 결제 내역 — append-only audit log.
     * 최신순 페이지네이션. 분쟁/환불 대응 및 세금신고 근거로 활용.
     */
    @GetMapping("/events")
    public ResponseEntity<BillingDto.PaymentEventsPage> listPaymentEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = SecurityUtils.currentUserId();
        Page<PaymentEvent> pageResult = billingService.listPaymentEvents(userId, page, size);

        List<BillingDto.PaymentEventResponse> events = pageResult.getContent().stream()
                .map(e -> BillingDto.PaymentEventResponse.builder()
                        .id(e.getId())
                        .eventType(e.getEventType() != null ? e.getEventType().name() : null)
                        .planType(e.getPlanType())
                        .amount(e.getAmount())
                        .status(e.getStatus())
                        .tossOrderId(e.getTossOrderId())
                        .failureReason(e.getFailureReason())
                        .createdAt(e.getCreatedAt() != null ? e.getCreatedAt().toString() : null)
                        .build())
                .toList();

        return ResponseEntity.ok(BillingDto.PaymentEventsPage.builder()
                .events(events)
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .build());
    }
}
