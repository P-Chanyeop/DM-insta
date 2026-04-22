package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.BillingDto;
import com.instabot.backend.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @PostMapping("/checkout")
    public ResponseEntity<BillingDto.CheckoutResponse> createCheckout(
            @Valid @RequestBody BillingDto.CreateCheckoutRequest request) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.createCheckoutSession(userId, request.getPlanType()));
    }

    /**
     * 프론트의 IMP.request_pay 콜백에서 imp_uid / merchant_uid 전달.
     * 서버는 Portone REST 로 재검증 후 구독 생성/갱신.
     */
    @PostMapping("/confirm")
    public ResponseEntity<BillingDto.BillingInfoResponse> confirmPayment(
            @Valid @RequestBody BillingDto.ConfirmPaymentRequest request) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(
                billingService.confirmPayment(userId, request.getImpUid(), request.getMerchantUid()));
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
}
