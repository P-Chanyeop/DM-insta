-- Add missing index on user_id for faster lookups
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Recreate FK constraints with ON DELETE CASCADE
ALTER TABLE team_members DROP FOREIGN KEY team_members_ibfk_1;
ALTER TABLE team_members DROP FOREIGN KEY team_members_ibfk_2;

ALTER TABLE team_members
    ADD CONSTRAINT fk_team_members_owner
        FOREIGN KEY (team_owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE team_members
    ADD CONSTRAINT fk_team_members_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
