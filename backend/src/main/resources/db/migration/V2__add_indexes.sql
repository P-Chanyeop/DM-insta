-- V2: Add composite indexes for common query patterns and widen encrypted token column

-- Encrypted tokens (AES-256-GCM + Base64) are longer than 255 chars
ALTER TABLE instagram_accounts MODIFY COLUMN access_token VARCHAR(1024);

-- flows: user dashboard and listing queries
CREATE INDEX idx_flows_user_created ON flows(user_id, created_at DESC);

-- contacts: user listing with active filter, sorted by subscription date
CREATE INDEX idx_contacts_user_active_subscribed ON contacts(user_id, active, subscribed_at DESC);

-- automations: user listing filtered by active status and type
CREATE INDEX idx_automations_user_active_type ON automations(user_id, active, type);

-- broadcasts: user listing filtered by status, sorted by creation date
CREATE INDEX idx_broadcasts_user_status_created ON broadcasts(user_id, status, created_at DESC);

-- conversations: user inbox filtered by status, sorted by last message
CREATE INDEX idx_conversations_user_status_lastmsg ON conversations(user_id, status, last_message_at DESC);

-- messages: conversation thread ordered by send time
CREATE INDEX idx_messages_conversation_sent ON messages(conversation_id, sent_at ASC);
