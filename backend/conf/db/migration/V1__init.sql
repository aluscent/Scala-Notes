CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  last_failed DATE,
  CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_categories_user_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS tags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  CONSTRAINT fk_tags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_tags_user_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS notes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(256) NOT NULL,
  content CLOB NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_notes_id_user UNIQUE (id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_notes_user_title ON notes(user_id, title);

CREATE TABLE IF NOT EXISTS note_categories (
  note_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (note_id, category_id, user_id),
  CONSTRAINT fk_note_categories_note FOREIGN KEY (note_id, user_id) REFERENCES notes(id, user_id) ON DELETE CASCADE,
  CONSTRAINT fk_note_categories_category FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (note_id, tag_id, user_id),
  CONSTRAINT fk_note_tags_note FOREIGN KEY (note_id, user_id) REFERENCES notes(id, user_id) ON DELETE CASCADE,
  CONSTRAINT fk_note_tags_tag FOREIGN KEY (tag_id, user_id) REFERENCES tags(id, user_id) ON DELETE CASCADE
);
