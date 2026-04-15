-- V9: 공동구매, 반복 구독, A/B 테스트, 노드 실행 기록 테이블

-- ── 공동구매 ──
CREATE TABLE IF NOT EXISTS group_buys (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL,
    flow_id         BIGINT          NULL,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT            NULL,
    max_quantity    INT             DEFAULT 0,
    current_count   INT             DEFAULT 0,
    price           VARCHAR(255)    NULL,
    payment_link    VARCHAR(255)    NULL,
    image_url       VARCHAR(255)    NULL,
    options         TEXT            NULL,
    status          VARCHAR(50)     DEFAULT 'DRAFT',
    created_at      DATETIME(6)     NULL,
    opened_at       DATETIME(6)     NULL,
    closed_at       DATETIME(6)     NULL,
    PRIMARY KEY (id),
    INDEX idx_gb_user   (user_id),
    INDEX idx_gb_flow   (flow_id),
    INDEX idx_gb_status (status),
    CONSTRAINT fk_gb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_gb_flow FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 공동구매 참여자 ──
CREATE TABLE IF NOT EXISTS group_buy_participants (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    group_buy_id    BIGINT          NOT NULL,
    contact_id      BIGINT          NOT NULL,
    selected_option VARCHAR(255)    NULL,
    quantity        INT             DEFAULT 1,
    amount          VARCHAR(255)    NULL,
    tracking_number VARCHAR(255)    NULL,
    memo            VARCHAR(255)    NULL,
    status          VARCHAR(50)     DEFAULT 'APPLIED',
    applied_at      DATETIME(6)     NULL,
    paid_at         DATETIME(6)     NULL,
    shipped_at      DATETIME(6)     NULL,
    delivered_at    DATETIME(6)     NULL,
    PRIMARY KEY (id),
    INDEX idx_gbp_groupbuy (group_buy_id),
    INDEX idx_gbp_contact  (contact_id),
    INDEX idx_gbp_status   (status),
    CONSTRAINT fk_gbp_groupbuy FOREIGN KEY (group_buy_id) REFERENCES group_buys(id) ON DELETE CASCADE,
    CONSTRAINT fk_gbp_contact  FOREIGN KEY (contact_id)   REFERENCES contacts(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 반복 알림 구독 ──
CREATE TABLE IF NOT EXISTS recurring_subscriptions (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL,
    contact_id          BIGINT          NOT NULL,
    topic               VARCHAR(100)    NOT NULL,
    topic_label         VARCHAR(255)    NULL,
    notification_token  VARCHAR(512)    NULL,
    token_expires_at    DATETIME(6)     NULL,
    frequency           VARCHAR(50)     DEFAULT 'WEEKLY',
    status              VARCHAR(50)     DEFAULT 'ACTIVE',
    subscribed_at       DATETIME(6)     NULL,
    unsubscribed_at     DATETIME(6)     NULL,
    last_sent_at        DATETIME(6)     NULL,
    sent_count          INT             DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_rs_contact_topic (contact_id, topic, user_id),
    INDEX idx_rs_user_topic    (user_id, topic),
    INDEX idx_rs_contact_topic (contact_id, topic),
    INDEX idx_rs_status        (status),
    CONSTRAINT fk_rs_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_rs_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── A/B 테스트 ──
CREATE TABLE IF NOT EXISTS ab_tests (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    flow_id             BIGINT          NOT NULL,
    test_name           VARCHAR(255)    NOT NULL,
    variant_apercent    INT             DEFAULT 50,
    variant_acount      BIGINT          DEFAULT 0,
    variant_bcount      BIGINT          DEFAULT 0,
    variant_acompleted  BIGINT          DEFAULT 0,
    variant_bcompleted  BIGINT          DEFAULT 0,
    status              VARCHAR(50)     DEFAULT 'RUNNING',
    created_at          DATETIME(6)     NULL,
    ended_at            DATETIME(6)     NULL,
    PRIMARY KEY (id),
    INDEX idx_abt_flow      (flow_id),
    INDEX idx_abt_flow_name (flow_id, test_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 노드 실행 기록 ──
CREATE TABLE IF NOT EXISTS node_executions (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    flow_id     BIGINT          NOT NULL,
    node_type   VARCHAR(255)    NOT NULL,
    action      VARCHAR(50)     DEFAULT 'ENTERED',
    contact_id  BIGINT          NULL,
    executed_at DATETIME(6)     NULL,
    metadata    TEXT            NULL,
    PRIMARY KEY (id),
    INDEX idx_ne_flow_node (flow_id, node_type, executed_at),
    INDEX idx_ne_flow_date (flow_id, executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
