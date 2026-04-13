-- V3: 플로우 조건부 실행 + 팔로업 영구 스케줄링 지원

CREATE TABLE pending_flow_actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flow_id BIGINT NOT NULL,
    ig_account_id BIGINT NOT NULL,
    sender_ig_id VARCHAR(255) NOT NULL,
    comment_id VARCHAR(255),
    pending_step ENUM('AWAITING_POSTBACK', 'AWAITING_FOLLOW', 'AWAITING_EMAIL', 'COMPLETED') NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6),
    CONSTRAINT fk_pfa_flow FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
    CONSTRAINT fk_pfa_ig_account FOREIGN KEY (ig_account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pfa_sender_step ON pending_flow_actions(sender_ig_id, pending_step);
CREATE INDEX idx_pfa_expires ON pending_flow_actions(expires_at);

CREATE TABLE scheduled_follow_ups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ig_account_id BIGINT NOT NULL,
    recipient_ig_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_at DATETIME(6) NOT NULL,
    status ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    sent_at DATETIME(6),
    created_at DATETIME(6),
    CONSTRAINT fk_sfu_ig_account FOREIGN KEY (ig_account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sfu_status_scheduled ON scheduled_follow_ups(status, scheduled_at);
