-- Portone(Iamport) + Danal → 토스페이먼츠(TossPayments) 전환.
-- 운영 DB 에 활성 Portone 구독자가 없다는 전제로 destructive 마이그레이션.
-- (있다면 먼저 Portone 쪽에서 해지 후 실행 필요.)

-- 기존 인덱스 조건부 삭제 (V16 에서 생성된 것들).
SET @idx_portone_merchant := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'subscriptions' AND index_name = 'uk_portone_merchant');
SET @idx_portone_customer := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'subscriptions' AND index_name = 'idx_portone_customer');

SET @sql := IF(@idx_portone_merchant > 0, 'ALTER TABLE subscriptions DROP INDEX uk_portone_merchant', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@idx_portone_customer > 0, 'ALTER TABLE subscriptions DROP INDEX idx_portone_customer', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 컬럼 리네임/교체
--   portone_customer_uid  → toss_customer_key (고객 식별자, 프론트 SDK 초기화용)
--   portone_merchant_uid  → toss_order_id    (최근 회차 주문 ID)
--   portone_imp_uid       → toss_payment_key (최근 성공 결제 키)
--   추가: toss_billing_key (정기결제용 카드 토큰 — Toss 고유, Portone 의 customer_uid 와 분리됨)
ALTER TABLE subscriptions
    CHANGE COLUMN portone_customer_uid toss_customer_key VARCHAR(64) NULL,
    CHANGE COLUMN portone_merchant_uid toss_order_id VARCHAR(64) NULL,
    CHANGE COLUMN portone_imp_uid toss_payment_key VARCHAR(255) NULL;

ALTER TABLE subscriptions
    ADD COLUMN toss_billing_key VARCHAR(255) NULL AFTER toss_customer_key;

-- 인덱스 재생성
CREATE UNIQUE INDEX uk_toss_order_id ON subscriptions(toss_order_id);
CREATE INDEX idx_toss_customer_key ON subscriptions(toss_customer_key);
CREATE INDEX idx_toss_billing_key ON subscriptions(toss_billing_key);
