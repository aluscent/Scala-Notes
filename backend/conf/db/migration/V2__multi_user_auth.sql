CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  last_failed DATE,
  CONSTRAINT uk_users_email UNIQUE (email)
);

-- Seed a default user for existing data; password must be reset via signup/login flows.
INSERT INTO users (email, password_hash, failed_attempts, last_failed)
SELECT 'default@example.com', '$argon2id$v=19$m=65536,t=3,p=1$RFZJSzdZN21ZcWxJbW1VLw$F8ZBvBy27ek8C7biZypkrFZqH3N82Cc6MbaXkY0giM8', 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'default@example.com');

ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 1;

ALTER TABLE categories ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tags ADD CONSTRAINT fk_tags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS uk_categories_name;
ALTER TABLE tags DROP CONSTRAINT IF EXISTS uk_tags_name;
CREATE UNIQUE INDEX IF NOT EXISTS uk_categories_user_name ON categories(user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uk_tags_user_name ON tags(user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uk_notes_id_user ON notes(id, user_id);
DROP INDEX IF EXISTS idx_note_title;
CREATE INDEX IF NOT EXISTS idx_notes_user_title ON notes(user_id, title);

ALTER TABLE note_categories ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE note_tags ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 1;

ALTER TABLE note_categories DROP CONSTRAINT IF EXISTS fk_note_categories_note;
ALTER TABLE note_categories DROP CONSTRAINT IF EXISTS fk_note_categories_category;
ALTER TABLE note_tags DROP CONSTRAINT IF EXISTS fk_note_tags_note;
ALTER TABLE note_tags DROP CONSTRAINT IF EXISTS fk_note_tags_tag;

ALTER TABLE note_categories DROP CONSTRAINT IF EXISTS pk_note_categories;
ALTER TABLE note_tags DROP CONSTRAINT IF EXISTS pk_note_tags;
ALTER TABLE note_categories ADD CONSTRAINT pk_note_categories PRIMARY KEY (note_id, category_id, user_id);
ALTER TABLE note_tags ADD CONSTRAINT pk_note_tags PRIMARY KEY (note_id, tag_id, user_id);

ALTER TABLE note_categories ADD CONSTRAINT fk_note_categories_note FOREIGN KEY (note_id, user_id) REFERENCES notes(id, user_id) ON DELETE CASCADE;
ALTER TABLE note_categories ADD CONSTRAINT fk_note_categories_category FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE CASCADE;
ALTER TABLE note_tags ADD CONSTRAINT fk_note_tags_note FOREIGN KEY (note_id, user_id) REFERENCES notes(id, user_id) ON DELETE CASCADE;
ALTER TABLE note_tags ADD CONSTRAINT fk_note_tags_tag FOREIGN KEY (tag_id, user_id) REFERENCES tags(id, user_id) ON DELETE CASCADE;
