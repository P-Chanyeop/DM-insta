-- V24: Flow 에 priority 컬럼 추가
--
-- 같은 triggerType 안에서 여러 플로우가 같은 메시지/댓글에 매칭될 때 누가 먼저 실행될지
-- 결정하는 우선순위. ManyChat 의 "Keyword Priority" 에 해당. 값이 낮을수록 우선(ASC 정렬).
-- 기존 데이터는 0 으로 채워지므로 createdAt 만으로 정렬되던 과거 동작과 동일(tiebreaker).
--
-- NULL 허용 안 함 — ORDER BY priority ASC 에서 NULL 처리 모호성 제거.

ALTER TABLE flows
    ADD COLUMN priority INT NOT NULL DEFAULT 0;
