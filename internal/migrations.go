package internal

import (
	"database/sql"
	"log"
	"strings"
)

func MigrateDB(db *sql.DB) {
	var err error
	migrations := []string{
		"ALTER TABLE messages ADD COLUMN is_archived INTEGER DEFAULT 0;",
		"ALTER TABLE messages ADD COLUMN sort_order INTEGER DEFAULT 0; UPDATE messages SET sort_order = id WHERE sort_order = 0;",
		"ALTER TABLE messages ADD COLUMN content_lower TEXT; UPDATE messages SET content_lower = LOWER(content) WHERE content_lower IS NULL; DROP INDEX IF EXISTS idx_messages_content_lower;",
		"ALTER TABLE tags ADD COLUMN sort_order INTEGER DEFAULT 0; UPDATE tags SET sort_order = id WHERE sort_order = 0;",
		"ALTER TABLE messages ADD COLUMN color TEXT DEFAULT '';",
		"ALTER TABLE messages ADD COLUMN used_at DATETIME DEFAULT 0;",
	}
	for _, migration := range migrations {
		_, err = db.Query(migration)
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			log.Printf("Migrate query error: %v", err)
		}
	}

	var dfltValue sql.NullString
	err = db.QueryRow("SELECT dflt_value FROM pragma_table_info('messages') WHERE name = 'used_at'").Scan(&dfltValue)

	if err == nil && dfltValue.Valid && (dfltValue.String == "0" || dfltValue.String == "'0'") {
		log.Println("Detected old default '0' for used_at. Recreating messages table...")

		migrationSQL := `
	PRAGMA foreign_keys=OFF;
	BEGIN TRANSACTION;

	CREATE TABLE messages_new (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		content TEXT,
		content_lower TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		is_archived INTEGER DEFAULT 0,
		color TEXT DEFAULT '',
		sort_order INTEGER DEFAULT 0
	);

	-- Переносим данные, исправляя 0 на текущее время
	INSERT INTO messages_new (id, content, content_lower, updated_at, created_at, used_at, is_archived, color, sort_order)
	SELECT id, content, content_lower, updated_at, created_at, 
	       (CASE WHEN used_at = 0 OR used_at = '0' THEN CURRENT_TIMESTAMP ELSE used_at END), 
	       is_archived, color, sort_order 
	FROM messages;

	DROP TABLE messages;
	ALTER TABLE messages_new RENAME TO messages;

	-- Восстанавливаем индексы, так как они удалились вместе с таблицей
	CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);
	CREATE INDEX IF NOT EXISTS idx_messages_sort_order ON messages(sort_order DESC, id DESC);
	CREATE INDEX IF NOT EXISTS idx_messages_content_lower_fast ON messages(content_lower);

	COMMIT;
	PRAGMA foreign_keys=ON;`
		if _, err := db.Exec(migrationSQL); err != nil {
			log.Fatalf("Table recreation failed: %v", err)
		}
		log.Println("Messages table successfully recreated with CURRENT_TIMESTAMP default.")
	}
}
