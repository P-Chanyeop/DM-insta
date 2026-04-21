-- User OAuth 컬럼 추가 (ddl-auto에 의존하지 않고 명시적으로 생성)
-- Hibernate ddl-auto:update가 이미 생성했을 수 있으므로 IF NOT EXISTS 사용

-- auth_provider: EMAIL, FACEBOOK, INSTAGRAM
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'auth_provider');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT ''EMAIL''',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- facebook_user_id (Instagram user ID 저장)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'facebook_user_id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN facebook_user_id VARCHAR(255)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- facebook_access_token (암호화된 장기 토큰)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'facebook_access_token');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN facebook_access_token VARCHAR(2048)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- facebook_token_expires_at
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'facebook_token_expires_at');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN facebook_token_expires_at DATETIME(6)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- industry
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'industry');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN industry VARCHAR(255)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- onboarding_completed
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'onboarding_completed');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- email_verified
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email_verified');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- password nullable로 변경 (OAuth 가입 시 null)
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;

-- facebook_user_id 인덱스 (로그인 시 조회 성능)
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_facebook_user_id');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_users_facebook_user_id ON users(facebook_user_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
