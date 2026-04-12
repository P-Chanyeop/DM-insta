-- V1: 초기 스키마 생성
-- Instagram DM 자동화 플랫폼 (ManyChat 클론)

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    plan ENUM('FREE', 'PRO', 'ENTERPRISE') DEFAULT 'FREE',
    created_at DATETIME(6),
    updated_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ig_user_id VARCHAR(255),
    username VARCHAR(255),
    name VARCHAR(255),
    profile_picture_url VARCHAR(255),
    message_count INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    memo VARCHAR(255),
    custom_fields TEXT,
    subscribed_at DATETIME(6),
    last_active_at DATETIME(6),
    CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contact_tags (
    contact_id BIGINT NOT NULL,
    tag VARCHAR(255),
    CONSTRAINT fk_contact_tags_contact FOREIGN KEY (contact_id) REFERENCES contacts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE flows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    trigger_type ENUM('KEYWORD', 'COMMENT', 'STORY_MENTION', 'STORY_REPLY', 'WELCOME', 'ICEBREAKER'),
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
    active BOOLEAN NOT NULL DEFAULT FALSE,
    flow_data TEXT,
    sent_count BIGINT DEFAULT 0,
    open_rate DOUBLE,
    created_at DATETIME(6),
    updated_at DATETIME(6),
    CONSTRAINT fk_flows_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE automations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    flow_id BIGINT,
    name VARCHAR(255) NOT NULL,
    type ENUM('DM_KEYWORD', 'COMMENT_TRIGGER', 'STORY_MENTION', 'STORY_REPLY', 'WELCOME_MESSAGE', 'ICEBREAKER') NOT NULL,
    keyword VARCHAR(255),
    match_type ENUM('CONTAINS', 'EXACT') DEFAULT 'CONTAINS',
    post_id VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_count BIGINT DEFAULT 0,
    created_at DATETIME(6),
    CONSTRAINT fk_automations_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_automations_flow FOREIGN KEY (flow_id) REFERENCES flows(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE broadcasts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    message_content TEXT,
    segment VARCHAR(255),
    status ENUM('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED') DEFAULT 'DRAFT',
    sent_count BIGINT DEFAULT 0,
    open_count BIGINT DEFAULT 0,
    click_count BIGINT DEFAULT 0,
    open_rate DOUBLE,
    click_rate DOUBLE,
    scheduled_at DATETIME(6),
    sent_at DATETIME(6),
    created_at DATETIME(6),
    CONSTRAINT fk_broadcasts_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    contact_id BIGINT NOT NULL,
    status ENUM('OPEN', 'CLOSED', 'SNOOZED') DEFAULT 'OPEN',
    last_message VARCHAR(255),
    automation_paused BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to VARCHAR(255),
    last_message_at DATETIME(6),
    created_at DATETIME(6),
    CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_conversations_contact FOREIGN KEY (contact_id) REFERENCES contacts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    direction ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    type ENUM('TEXT', 'IMAGE', 'CARD', 'BUTTON', 'QUICK_REPLY') DEFAULT 'TEXT',
    content TEXT,
    media_url VARCHAR(255),
    automated BOOLEAN NOT NULL DEFAULT FALSE,
    automation_name VARCHAR(255),
    `read` BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at DATETIME(6),
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sequences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    active_subscribers BIGINT DEFAULT 0,
    completion_rate DOUBLE,
    created_at DATETIME(6),
    CONSTRAINT fk_sequences_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sequence_steps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sequence_id BIGINT NOT NULL,
    step_order INT NOT NULL,
    name VARCHAR(255),
    message_content TEXT,
    delay_minutes INT NOT NULL DEFAULT 0,
    type ENUM('MESSAGE', 'CONDITION', 'DELAY', 'TAG', 'NOTIFY') DEFAULT 'MESSAGE',
    open_rate DOUBLE,
    click_rate DOUBLE,
    CONSTRAINT fk_sequence_steps_sequence FOREIGN KEY (sequence_id) REFERENCES sequences(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator_id BIGINT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    category VARCHAR(255),
    flow_data TEXT,
    icon VARCHAR(255),
    gradient_colors VARCHAR(255),
    usage_count BIGINT DEFAULT 0,
    rating DOUBLE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6),
    CONSTRAINT fk_templates_creator FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE instagram_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ig_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    access_token VARCHAR(255),
    profile_picture_url VARCHAR(255),
    followers_count BIGINT DEFAULT 0,
    account_type VARCHAR(255),
    connected BOOLEAN NOT NULL DEFAULT FALSE,
    connected_at DATETIME(6),
    token_expires_at DATETIME(6),
    CONSTRAINT fk_instagram_accounts_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE integrations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('INSTAGRAM', 'SHOPIFY', 'GOOGLE_SHEETS', 'STRIPE', 'KLAVIYO', 'WEBHOOK', 'OPENAI'),
    name VARCHAR(255),
    config TEXT,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6),
    last_sync_at DATETIME(6),
    CONSTRAINT fk_integrations_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE growth_tools (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('REF_LINK', 'QR_CODE', 'WEBSITE_WIDGET', 'JSON_API'),
    name VARCHAR(255),
    ref_url VARCHAR(255),
    config VARCHAR(255),
    click_count BIGINT DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6),
    CONSTRAINT fk_growth_tools_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE custom_fields (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    field_type ENUM('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'EMAIL', 'PHONE', 'URL') DEFAULT 'TEXT',
    default_value VARCHAR(255),
    created_at DATETIME(6),
    CONSTRAINT fk_custom_fields_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 성능 인덱스
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_active ON contacts(user_id, active);
CREATE INDEX idx_flows_user_id ON flows(user_id);
CREATE INDEX idx_flows_user_active ON flows(user_id, active);
CREATE INDEX idx_automations_user_id ON automations(user_id);
CREATE INDEX idx_automations_user_type ON automations(user_id, type);
CREATE INDEX idx_broadcasts_user_id ON broadcasts(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
