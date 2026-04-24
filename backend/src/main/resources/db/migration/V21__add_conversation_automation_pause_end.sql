-- V21: conversations.automation_pause_end 컬럼 추가
--
-- 수동 메시지 발송 시 now+24h 를 저장해 자동화 재개 시점을 DB 에 영속화.
-- 지금까지는 프론트 상태로만 관리돼 새로고침 시 타이머가 사라지고, 서버도
-- 몇 시까지 일시정지인지 모르는 문제를 해결.

ALTER TABLE conversations
    ADD COLUMN automation_pause_end DATETIME NULL;
