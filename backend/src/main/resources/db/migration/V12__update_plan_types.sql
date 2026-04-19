-- 플랜 타입 변경: ENTERPRISE → BUSINESS, STARTER 추가
ALTER TABLE users MODIFY COLUMN plan ENUM('FREE', 'STARTER', 'PRO', 'BUSINESS') DEFAULT 'FREE';

-- 기존 ENTERPRISE 유저가 있으면 BUSINESS로 마이그레이션 (MySQL ENUM 변경 전에 데이터가 있을 경우)
-- ALTER TABLE 시 기존 ENTERPRISE 값은 빈 문자열이 되므로 아래로 복구
UPDATE users SET plan = 'BUSINESS' WHERE plan = '' OR plan IS NULL AND created_at IS NOT NULL;
