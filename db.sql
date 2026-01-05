-- Основная таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    content_lower TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_archived INTEGER DEFAULT 0
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

-- Ускорение загрузки вложений
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- Ускорение фильтрации по тегам
CREATE INDEX IF NOT EXISTS idx_message_tags_tag_id ON message_tags(tag_id);

-- Оптимизация сортировки по дате
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- И индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);

-- Индекс для быстрой выборки по порядку
CREATE INDEX IF NOT EXISTS idx_messages_sort_order ON messages(sort_order DESC, id DESC);

-- Создаем индекс для мгновенного поиска
CREATE INDEX IF NOT EXISTS idx_messages_content_lower_fast ON messages(content_lower);