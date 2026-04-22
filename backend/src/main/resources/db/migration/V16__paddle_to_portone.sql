-- Paddle → Portone(Iamport) + Danal 전환.
-- 운영 DB에 활성 Paddle 구독자가 없다는 전제 하에 destructive 마이그레이션.
-- (있다면 먼저 Paddle 쪽에서 해지 후 실행 필요.)

SET @old_idx_paddle_sub := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'subscriptions' AND index_name = 'uk_paddle_subscription');
SET @old_idx_paddle_cus := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'subscriptions' AND index_name = 'idx_paddle_customer');

SET @sql := IF(@old_idx_paddle_sub > 0, 'ALTER TABLE subscriptions DROP INDEX uk_paddle_subscription', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@old_idx_paddle_cus > 0, 'ALTER TABLE subscriptions DROP INDEX idx_paddle_customer', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 컬럼 리네임 + 추가
ALTER TABLE subscriptions
    CHANGE COLUMN paddle_customer_id portone_customer_uid VARCHAR(255),
    CHANGE COLUMN paddle_subscription_id portone_merchant_uid VARCHAR(255),
    DROP COLUMN paddle_price_id;

ALTER TABLE subscriptions
    ADD COLUMN portone_imp_uid VARCHAR(255) NULL AFTER portone_merchant_uid,
    ADD COLUMN plan_type VARCHAR(20) NULL AFTER portone_imp_uid,
    ADD COLUMN amount BIGINT NULL AFTER plan_type,
    ADD COLUMN next_payment_at DATETIME NULL AFTER current_period_end;

-- 인덱스 재생성
CREATE UNIQUE INDEX uk_portone_merchant ON subscriptions(portone_merchant_uid);
CREATE INDEX idx_portone_customer ON subscriptions(portone_customer_uid);
CREATE INDEX idx_next_payment_at ON subscriptions(next_payment_at);
