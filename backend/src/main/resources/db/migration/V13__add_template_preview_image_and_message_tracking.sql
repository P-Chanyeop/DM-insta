-- 템플릿 미리보기 이미지 URL
ALTER TABLE templates ADD COLUMN IF NOT EXISTS preview_image_url VARCHAR(512);

-- 메시지 추적 필드 (읽음 확인, 플로우/브로드캐스트 연결)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ig_message_id VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS flow_id BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS broadcast_id BIGINT;

-- 시퀀스 완료율 추적
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS total_started BIGINT DEFAULT 0;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS total_completed BIGINT DEFAULT 0;

-- 기존 템플릿에 이미지 URL 업데이트
UPDATE templates SET preview_image_url = '/images/templates/shopping.svg' WHERE category = 'SHOPPING' AND name LIKE '%쇼핑몰%';
UPDATE templates SET preview_image_url = '/images/templates/groupbuy.svg' WHERE category = 'SHOPPING' AND name LIKE '%공동구매%';
UPDATE templates SET preview_image_url = '/images/templates/booking.svg' WHERE category = 'BOOKING';
UPDATE templates SET preview_image_url = '/images/templates/event.svg' WHERE category = 'EVENT';
UPDATE templates SET preview_image_url = '/images/templates/lead.svg' WHERE category = 'LEAD';
UPDATE templates SET preview_image_url = '/images/templates/support.svg' WHERE category = 'SUPPORT';
