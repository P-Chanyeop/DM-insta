CREATE TABLE notification_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    new_message BOOLEAN DEFAULT TRUE,
    automation_error BOOLEAN DEFAULT TRUE,
    daily_report BOOLEAN DEFAULT FALSE,
    weekly_report BOOLEAN DEFAULT TRUE,
    billing_alerts BOOLEAN DEFAULT TRUE,
    system_updates BOOLEAN DEFAULT TRUE
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
