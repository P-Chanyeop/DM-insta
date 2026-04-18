-- Stripe → Paddle 마이그레이션: 컬럼명 변경
ALTER TABLE subscriptions
    CHANGE COLUMN stripe_customer_id paddle_customer_id VARCHAR(255),
    CHANGE COLUMN stripe_subscription_id paddle_subscription_id VARCHAR(255),
    CHANGE COLUMN stripe_price_id paddle_price_id VARCHAR(255);

-- 기존 인덱스 제거 후 새 이름으로 재생성
ALTER TABLE subscriptions
    DROP INDEX IF EXISTS uk_stripe_subscription,
    DROP INDEX IF EXISTS idx_stripe_customer;

ALTER TABLE subscriptions
    ADD UNIQUE INDEX uk_paddle_subscription (paddle_subscription_id),
    ADD INDEX idx_paddle_customer (paddle_customer_id);
