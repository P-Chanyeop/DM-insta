package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

public class BillingDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateCheckoutRequest {
        @NotBlank
        private String planType;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CheckoutResponse {
        private String checkoutUrl;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BillingInfoResponse {
        private String plan;
        private String status;
        private String currentPeriodEnd;
        private boolean cancelAtPeriodEnd;
        private String stripeCustomerId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PortalResponse {
        private String portalUrl;
    }
}
