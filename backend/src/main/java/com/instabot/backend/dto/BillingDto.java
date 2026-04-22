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
     * 프론트에서 tossPayments.payment({customerKey}).requestBillingAuth() 호출에 필요한 파라미터.
     *
     *  - clientKey:   토스 SDK 초기화용 공개 키
     *  - customerKey: 이번 회원 고유 식별자 (서버에서 생성, DB 에 저장됨)
     *  - orderId:     최초 결제 주문 ID (성공 시 그대로 사용)
     *  - orderName:   결제창 표시 상품명
     *  - amount:      첫 회차 청구 금액
     *  - customerEmail/customerName: 영수증 발송 및 표시용
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CheckoutResponse {
        private String clientKey;
        private String customerKey;
        private String orderId;
        private String orderName;
        private long amount;
        private String customerEmail;
        private String customerName;
        private String planType;
    }

    /**
     * 결제창 성공 콜백에서 전달받은 authKey 를 billingKey 로 교환 + 첫 결제 수행.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ConfirmBillingAuthRequest {
        @NotBlank private String authKey;
        @NotBlank private String customerKey;
        @NotBlank private String planType;
        @NotBlank private String orderId;
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
