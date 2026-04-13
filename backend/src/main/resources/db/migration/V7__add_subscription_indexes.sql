-- Fix #9: stripe_subscription_id에 UNIQUE 인덱스, stripe_customer_id에 일반 인덱스 추가
ALTER TABLE subscriptions
    ADD UNIQUE INDEX uk_stripe_subscription (stripe_subscription_id),
    ADD INDEX idx_stripe_customer (stripe_customer_id);
