-- 이메일 인증 + 비밀번호 리셋 필드
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN verification_code_expires_at DATETIME;
ALTER TABLE users ADD COLUMN reset_code VARCHAR(6);
ALTER TABLE users ADD COLUMN reset_code_expires_at DATETIME;
