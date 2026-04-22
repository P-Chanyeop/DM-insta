package com.instabot.backend.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * 토스페이먼츠 정기결제 설정.
 *
 * 동작 개요
 *  1) 최초 결제: 프론트에서 tossPayments.payment({ customerKey }).requestBillingAuth({ method:'CARD' ... })
 *     → 토스 결제창에서 카드 등록 → successUrl 로 authKey + customerKey 전달.
 *  2) 서버가 POST /v1/billing/authorizations/issue 로 authKey → billingKey 교환.
 *  3) 첫 결제: POST /v1/billing/{billingKey} 로 즉시 청구, 성공 시 Subscription 저장.
 *  4) 매일 자정 스케줄러가 만료 임박 구독을 조회해 같은 /v1/billing/{billingKey} 로 재결제.
 *  5) Webhook 으로 결제 상태 변경 알림 수신.
 */
@Configuration
@Getter
public class TossPaymentsConfig {

    /** 클라이언트 키 — 프론트 SDK 초기화용. 공개되어도 무방. */
    @Value("${toss.client-key}")
    private String clientKey;

    /** 시크릿 키 — REST API 호출용. 절대 프론트 노출 금지. Basic 인증 header 에 사용. */
    @Value("${toss.secret-key}")
    private String secretKey;

    /** 플랜별 월 청구 금액(원, VAT 포함). */
    @Value("${toss.prices.starter:19900}")
    private long starterPrice;

    @Value("${toss.prices.pro:49900}")
    private long proPrice;

    @Value("${toss.prices.business:149900}")
    private long businessPrice;

    public String getApiBaseUrl() {
        return "https://api.tosspayments.com";
    }
}
