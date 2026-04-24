-- V23: Contact 에 email / phone 컬럼 추가
--
-- 연락처 상세 모달에서 고객 추후 관리용으로 이메일/전화번호를 수동 입력/편집할 수 있게 함.
-- Instagram DM API 는 상대방 이메일/전화번호를 제공하지 않으므로 값은 전적으로 사용자 입력.
-- 기존 데이터는 NULL 로 남고 UI 에서는 "—" 또는 빈 input 으로 표시.

ALTER TABLE contacts
    ADD COLUMN email VARCHAR(320) NULL,
    ADD COLUMN phone VARCHAR(50) NULL;
