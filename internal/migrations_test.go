package internal

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func TestMigrateDBRemovesExpandedColumn(t *testing.T) {
	database, err := sql.Open("sqlite", t.TempDir()+"/notes.db")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close() })

	if _, err := database.Exec(`
		CREATE TABLE messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			content TEXT,
			content_lower TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			is_archived INTEGER DEFAULT 0,
			is_deleted INTEGER DEFAULT 0,
			is_expanded INTEGER DEFAULT 0,
			color TEXT DEFAULT '',
			sort_order INTEGER DEFAULT 0
		);
		CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, sort_order INTEGER DEFAULT 0);
		INSERT INTO messages (content, content_lower, is_expanded, sort_order) VALUES ('kept', 'kept', 1, 7);
	`); err != nil {
		t.Fatal(err)
	}

	MigrateDB(database)

	var expandedColumnCount int
	if err := database.QueryRow("SELECT COUNT(*) FROM pragma_table_info('messages') WHERE name = 'is_expanded'").Scan(&expandedColumnCount); err != nil {
		t.Fatal(err)
	}
	if expandedColumnCount != 0 {
		t.Fatalf("is_expanded column count = %d, want 0", expandedColumnCount)
	}

	var content string
	var sortOrder int
	if err := database.QueryRow("SELECT content, sort_order FROM messages WHERE id = 1").Scan(&content, &sortOrder); err != nil {
		t.Fatal(err)
	}
	if content != "kept" || sortOrder != 7 {
		t.Fatalf("migrated note = (%q, %d), want (%q, %d)", content, sortOrder, "kept", 7)
	}
}

func TestMigrateDBRecreatesOldMessagesWithoutExpandedColumn(t *testing.T) {
	database, err := sql.Open("sqlite", t.TempDir()+"/notes.db")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close() })

	if _, err := database.Exec(`
		CREATE TABLE messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			content TEXT,
			content_lower TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			used_at DATETIME DEFAULT 0,
			is_archived INTEGER DEFAULT 0,
			is_deleted INTEGER DEFAULT 0,
			is_expanded INTEGER DEFAULT 0,
			color TEXT DEFAULT '',
			sort_order INTEGER DEFAULT 0
		);
		CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, sort_order INTEGER DEFAULT 0);
		INSERT INTO messages (content, content_lower, used_at, is_expanded, sort_order) VALUES ('kept', 'kept', 0, 1, 7);
	`); err != nil {
		t.Fatal(err)
	}

	MigrateDB(database)

	var expandedColumnCount int
	if err := database.QueryRow("SELECT COUNT(*) FROM pragma_table_info('messages') WHERE name = 'is_expanded'").Scan(&expandedColumnCount); err != nil {
		t.Fatal(err)
	}
	if expandedColumnCount != 0 {
		t.Fatalf("is_expanded column count = %d, want 0", expandedColumnCount)
	}

	var content string
	var usedAt string
	if err := database.QueryRow("SELECT content, used_at FROM messages WHERE id = 1").Scan(&content, &usedAt); err != nil {
		t.Fatal(err)
	}
	if content != "kept" || usedAt == "" || usedAt == "0" {
		t.Fatalf("migrated note = (%q, %q), want preserved content and current used_at", content, usedAt)
	}
}
