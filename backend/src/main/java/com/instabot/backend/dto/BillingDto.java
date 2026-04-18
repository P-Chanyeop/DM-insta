package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

public class BillingDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateCheckoutRequest {
        @NotBlank
        @Pattern(regexp = "(?i)^(PRO|ENTERPRISE)$", message = "플랜은 PRO 또는 ENTERPRISE만 가능합니다.")
        private String planType;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CheckoutResponse {
        private String checkoutUrl;          // priceId (프론트에서 Paddle.Checkout.open에 사용)
        private String paddleClientToken;    // Paddle client-side token
        private String paddleEnvironment;    // "sandbox" 또는 "production"
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BillingInfoResponse {
        private String plan;
        private String status;
        private String currentPeriodEnd;
        private boolean cancelAtPeriodEnd;

        // 플랜별 한도 체크용 usage (S5/S16 fix)
        private Long flowCount;
        private Long automationCount;
        private Long contactCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PortalResponse {
        private String portalUrl;
    }
}
