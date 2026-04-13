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

    @PostMapping("/portal")
    public ResponseEntity<BillingDto.PortalResponse> createPortal() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.createPortalSession(userId));
    }

    @GetMapping("/info")
    public ResponseEntity<BillingDto.BillingInfoResponse> getBillingInfo() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(billingService.getBillingInfo(userId));
    }
}
