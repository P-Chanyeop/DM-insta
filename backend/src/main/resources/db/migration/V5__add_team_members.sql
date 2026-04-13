CREATE TABLE team_members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_owner_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_owner_id) REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_team_user (team_owner_id, user_id)
);
