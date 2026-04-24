-- V20: messages.direction / messages.type 에 SYSTEM 값 허용
--
-- 라이브 채팅의 "대화가 X에게 배정되었습니다 / 자동화 재개" 같은 이벤트 메시지를
-- DB에 영속화하기 위해 Message.Direction / Message.MessageType enum 에 SYSTEM 추가.
-- MySQL ENUM 컬럼은 기존 값 외의 값을 거부하므로(SQLSTATE 01000) 스키마를 확장한다.
--
-- 기존 row 에는 영향 없음 (값 추가만 함).

ALTER TABLE messages
    MODIFY COLUMN direction ENUM('INBOUND', 'OUTBOUND', 'SYSTEM') NOT NULL;

ALTER TABLE messages
    MODIFY COLUMN type ENUM('TEXT', 'IMAGE', 'CARD', 'BUTTON', 'QUICK_REPLY', 'SYSTEM') DEFAULT 'TEXT';
