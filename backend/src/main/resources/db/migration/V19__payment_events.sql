-- V19: 결제 이벤트 히스토리 테이블
--
-- subscriptions 테이블은 "현재 상태" 만 유지하므로 과거 결제/실패/환불/해지 내역이 덮어쓰기로 사라진다.
-- 이 테이블에 모든 결제 이벤트를 append-only 로 기록해 유저의 결제 내역 페이지, 감사 추적,
-- 분쟁 발생 시 증거, 국세청 신고 금액 추적에 사용한다.
--
-- 절대 UPDATE 하지 말 것 — 변경 불가 audit log.
CREATE TABLE payment_events (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    subscription_id BIGINT NULL,            -- subscription row 삭제돼도 이벤트는 남음
    event_type      VARCHAR(32) NOT NULL,   -- CHARGE_SUCCESS / CHARGE_FAILED / PLAN_CHANGE / CANCEL_SCHEDULED / CANCELED / REFUND / WEBHOOK_ABORTED / WEBHOOK_EXPIRED
    plan_type       VARCHAR(20) NULL,       -- STARTER / PRO / BUSINESS / FREE (해지 시)
    amount          BIGINT NULL,            -- 청구 금액(원). CHARGE_* 외에는 NULL 가능
    status          VARCHAR(30) NULL,       -- 토스 응답 status: DONE / ABORTED / EXPIRED / CANCELED ...
    toss_payment_key VARCHAR(255) NULL,
    toss_order_id    VARCHAR(64) NULL,
    failure_code     VARCHAR(64) NULL,      -- 결제 실패 시 토스 에러 코드
    failure_reason   TEXT NULL,             -- 결제 실패 시 사유 또는 수동 해지 사유
    raw_response     JSON NULL,             -- 토스 원본 응답 (디버깅/감사 용)
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- subscription 은 nullable FK (구독 삭제돼도 히스토리는 유지)
    CONSTRAINT fk_payment_events_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- 유저별 최신순 조회 (결제 내역 페이지)
    INDEX idx_user_created (user_id, created_at DESC),
    -- 특정 주문 조회 (웹훅 멱등성 체크)
    INDEX idx_order (toss_order_id),
    -- 이벤트 타입별 집계 (월별 성공 결제 수 등)
    INDEX idx_event_type_created (event_type, created_at DESC)
);
