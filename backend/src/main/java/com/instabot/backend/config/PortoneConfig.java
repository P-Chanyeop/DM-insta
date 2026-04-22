package com.instabot.backend.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Portone(구 Iamport) V1 REST API + 다날(danal_tpay) 정기결제 설정.
 *
 * 동작 개요
 *  1) 최초 결제: 프론트에서 IMP.request_pay(customer_uid=cus_...)로 빌링키 등록과 첫 결제 동시 수행.
 *  2) 서버가 /payments/{imp_uid} 로 검증한 뒤 Subscription 저장.
 *  3) 매일 자정 스케줄러가 만료 임박 구독을 조회해 /subscribe/payments/again 으로 재결제.
 *  4) Webhook 으로 상태 동기화.
 *
 * Paddle 은 PG 가 자체 갱신하지만 Portone+Danal 은 서버가 직접 반복 결제를 요청해야 한다.
 */
@Configuration
@Getter
public class PortoneConfig {

    /** 가맹점 식별코드 (imp32683681) — 프론트/백 양쪽에서 사용. */
    @Value("${portone.imp-code}")
    private String impCode;

    /** REST API Key (공개되어도 큰 위험은 없으나 env 로 주입). */
    @Value("${portone.api-key}")
    private String apiKey;

    /** REST API Secret — 절대 프론트에 노출 금지. */
    @Value("${portone.api-secret}")
    private String apiSecret;

    /** 채널 키(복수 PG 지원 시 사용). 현재는 레퍼런스용. */
    @Value("${portone.channel-key:}")
    private String channelKey;

    /** PG 상점 코드. "danal_tpay.{CPID}" 형식으로 request_pay 에 전달. */
    @Value("${portone.pg-provider:danal_tpay}")
    private String pgProvider;

    @Value("${portone.cpid}")
    private String cpid;

    /** 플랜별 월 청구 금액(원). */
    @Value("${portone.prices.starter:19900}")
    private long starterPrice;

    @Value("${portone.prices.pro:49900}")
    private long proPrice;

    @Value("${portone.prices.business:149900}")
    private long businessPrice;

    /**
     * 프론트에 내려보낼 PG 문자열: "danal_tpay.9810030929".
     * request_pay({ pg: ... }) 에 그대로 쓰인다.
     */
    public String getPgString() {
        return pgProvider + "." + cpid;
    }

    public String getApiBaseUrl() {
        return "https://api.iamport.kr";
    }
}
