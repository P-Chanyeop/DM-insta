package com.instabot.backend.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Paddle 결제 설정.
 * Paddle은 Merchant of Record(MoR) 모델 — 세금/환불 자동 처리.
 * 카카오페이, 네이버페이, 삼성페이 등 한국 결제수단 네이티브 지원.
 */
@Configuration
@Getter
public class PaddleConfig {

    @Value("${paddle.api-key}")
    private String apiKey;

    @Value("${paddle.webhook-secret}")
    private String webhookSecret;

    @Value("${paddle.environment:sandbox}")
    private String environment;

    @Value("${paddle.prices.starter}")
    private String starterPriceId;

    @Value("${paddle.prices.pro}")
    private String proPriceId;

    @Value("${paddle.prices.business}")
    private String businessPriceId;

    @Value("${paddle.client-token}")
    private String clientToken;

    public boolean isSandbox() {
        return "sandbox".equalsIgnoreCase(environment);
    }

    public String getApiBaseUrl() {
        return isSandbox()
                ? "https://sandbox-api.paddle.com"
                : "https://api.paddle.com";
    }
}
