package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

public class BillingDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateCheckoutRequest {
        @NotBlank
        @Pattern(regexp = "(?i)^(STARTER|PRO|BUSINESS)$", message = "플랜은 STARTER, PRO 또는 BUSINESS만 가능합니다.")
        private String planType;
    }

    /**
     * 프론트에서 IMP.request_pay 호출에 필요한 파라미터 번들.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CheckoutResponse {
        private String impCode;         // IMP.init() 인자
        private String pg;              // "danal_tpay.9810030929"
        private String payMethod;       // "card" 고정
        private String merchantUid;     // 이번 주문 ID
        private String customerUid;     // 빌링키 식별자 — request_pay 에 전달하면 Portone 이 빌링키 저장
        private long amount;            // 원화 금액
        private String name;            // 결제창 표시 상품명 (예: "센드잇 Pro 플랜")
        private String buyerEmail;
        private String buyerName;
    }

    /**
     * 결제 완료 콜백에서 imp_uid / merchant_uid 를 서버로 보내 검증.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ConfirmPaymentRequest {
        @NotBlank private String impUid;
        @NotBlank private String merchantUid;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BillingInfoResponse {
        private String plan;
        private String status;
        private String currentPeriodEnd;
        private boolean cancelAtPeriodEnd;

        private Long flowCount;
        private Long automationCount;
        private Long contactCount;
        private Long monthlyDMCount;
    }
}
