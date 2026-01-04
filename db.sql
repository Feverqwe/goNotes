-- Основная таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица вложений (привязана к сообщению)
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT DEFAULT '',
    file_type TEXT, -- image, video, pdf и т.д.
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Таблицы тегов (остаются без изменений)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS message_tags (
    message_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (message_id, tag_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

