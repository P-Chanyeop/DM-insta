package com.instabot.backend.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class StripeConfig {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @Value("${stripe.publishable-key}")
    private String publishableKey;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${stripe.prices.pro}")
    private String proPriceId;

    @Value("${stripe.prices.enterprise}")
    private String enterprisePriceId;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }
}
