-- V26: Facebook Login for Business 전환 — instagram_accounts 에 fb_page_id 컬럼 추가
--
-- 배경: Instagram Business Login (IGUAT) 에서 Facebook Login for Business 패턴으로
-- OAuth flow 변경 (매니챗과 동일). Page Access Token 을 통해 IG API 호출하므로
-- 어느 Facebook Page 의 토큰인지 추적해야 한다.
--
-- access_token 컬럼은 그대로 재사용하되 의미만 변경:
--   - 이전: IGUAT (Instagram User Access Token)
--   - 이후: Page Access Token (IG 자산이 연결된 Facebook Page 의 토큰)
--
-- 기존 IGUAT 토큰들은 재 OAuth 전까지는 무효화 상태 — 사용자가 재 OAuth 시
-- 자동으로 Page Token 으로 교체된다.

ALTER TABLE instagram_accounts
    ADD COLUMN fb_page_id VARCHAR(64) NULL COMMENT 'IG 자산이 연결된 Facebook Page 의 ID — Page Token 추적용';

-- IG account 마다 유일한 Page 와 매핑되므로 unique 제약을 추가해도 되지만,
-- 한 Page 가 여러 IG 자산을 가질 수 있는 케이스 (Meta 의 미래 변경) 를 대비해
-- 인덱스만 추가 (중복 허용).
CREATE INDEX idx_instagram_accounts_fb_page_id ON instagram_accounts (fb_page_id);
