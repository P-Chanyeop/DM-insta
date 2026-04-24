-- V22: Instagram 24-hour / 7-day messaging window 추적 및 연락처 메타 정보 컬럼 추가
--
-- Meta 정책 기준 3단계 발송 가능 상태 (STANDARD / HUMAN_AGENT / OUTSIDE) 를 서버가 판단하려면
-- "상대방이 마지막으로 나에게 DM 을 보낸 시각" 을 별도로 추적해야 함.
-- 지금까지는 conversations.last_message_at 에 inbound/outbound 가 섞여 저장돼 윈도우 판정 불가.
--
-- 추가 목적:
--   1) conversations.last_inbound_at — 상대방이 마지막으로 보낸 시각 (24h / 7d 창 판정의 기준)
--   2) contacts.first_message_at     — Contact 생성 시점 (연락처 유입일, "첫 메시지" UI 표시용)
--   3) contacts.follower_count       — Instagram Graph API (insights 권한 필요) 로 나중에 채울 필드 자리

ALTER TABLE conversations
    ADD COLUMN last_inbound_at DATETIME NULL;

-- 기존 데이터 backfill: lastMessageAt 을 일단 초기값으로 — 첫 인바운드 도착 시 실제 값으로 갱신됨.
-- 완벽한 구분은 아니지만 기존 대화가 "영원히 OUTSIDE" 로 잠기는 문제를 막는 용도.
UPDATE conversations
   SET last_inbound_at = last_message_at
 WHERE last_inbound_at IS NULL;

ALTER TABLE contacts
    ADD COLUMN first_message_at DATETIME NULL,
    ADD COLUMN follower_count INT NULL;

-- 기존 Contact 는 subscribedAt(기본값 NOW) 을 firstMessageAt 으로 간주 — 근사치라도 UI 공백 방지.
UPDATE contacts
   SET first_message_at = subscribed_at
 WHERE first_message_at IS NULL;
