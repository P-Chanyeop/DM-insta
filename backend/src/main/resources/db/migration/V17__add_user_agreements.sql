-- 약관 동의 증빙용 타임스탬프 컬럼 추가.
-- NULL = 미동의, 값 있음 = 동의한 시각 (전자상거래법/개인정보보호법 감사 대응).

ALTER TABLE users
    ADD COLUMN terms_agreed_at DATETIME NULL AFTER reset_code_expires_at,
    ADD COLUMN privacy_agreed_at DATETIME NULL AFTER terms_agreed_at,
    ADD COLUMN marketing_agreed_at DATETIME NULL AFTER privacy_agreed_at;

-- 기존 유저는 가입 시점을 약관 동의 시각으로 간주 (암묵적 동의 처리 — 이후 가입부터는 폼에서 명시 수집).
UPDATE users
SET terms_agreed_at = COALESCE(created_at, NOW()),
    privacy_agreed_at = COALESCE(created_at, NOW())
WHERE terms_agreed_at IS NULL;
