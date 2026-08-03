package internal

import (
	"database/sql"
	"encoding/json"
	"goNotes/internal/cfg"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

func TestMessageSearchSeparatesTrash(t *testing.T) {
	database, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "notes.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })

	if _, err := database.Exec(`
		CREATE TABLE messages (
			id INTEGER PRIMARY KEY,
			content TEXT,
			content_lower TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			is_archived INTEGER DEFAULT 0,
			is_deleted INTEGER DEFAULT 0,
			sort_order INTEGER DEFAULT 0,
			color TEXT DEFAULT ''
		);
		CREATE TABLE attachments (
			id INTEGER PRIMARY KEY,
			message_id INTEGER NOT NULL,
			file_path TEXT NOT NULL,
			thumbnail_path TEXT DEFAULT '',
			file_type TEXT
		);
		CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT);
		CREATE TABLE message_tags (message_id INTEGER, tag_id INTEGER);
		INSERT INTO messages (id, content, content_lower, is_deleted, sort_order)
		VALUES (1, 'live needle', 'live needle', 0, 2),
		       (2, 'trash needle', 'trash needle', 1, 1);
	`); err != nil {
		t.Fatal(err)
	}

	router := NewRouter()
	previousDB := db
	t.Cleanup(func() { db = previousDB })
	HandleApi(router, database, &cfg.Config{})

	assertSearchIDs := func(path string, wantID int64) {
		t.Helper()
		request := httptest.NewRequest(http.MethodGet, path, nil)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("GET %s returned %d: %s", path, response.Code, response.Body.String())
		}

		var body struct {
			Result []MessageDTO `json:"result"`
		}
		if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if len(body.Result) != 1 || body.Result[0].ID != wantID {
			t.Fatalf("GET %s returned message IDs %+v, want [%d]", path, body.Result, wantID)
		}
	}

	assertSearchIDs("/api/messages/list?q=needle", 1)
	assertSearchIDs("/api/messages/list?q=needle&deleted=1", 2)
}

func TestTrashOrDeleteMessages(t *testing.T) {
	database, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "notes.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })

	if _, err := database.Exec(`
		PRAGMA foreign_keys=ON;
		CREATE TABLE messages (
			id INTEGER PRIMARY KEY,
			is_deleted INTEGER DEFAULT 0
		);
		CREATE TABLE attachments (
			id INTEGER PRIMARY KEY,
			message_id INTEGER NOT NULL,
			file_path TEXT NOT NULL,
			thumbnail_path TEXT DEFAULT '',
			FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
		);
		INSERT INTO messages (id) VALUES (1), (2);
	`); err != nil {
		t.Fatal(err)
	}

	previousDB := db
	db = database
	t.Cleanup(func() { db = previousDB })

	processed, err := trashOrDeleteMessages([]int64{1, 2})
	if err != nil {
		t.Fatal(err)
	}
	if processed != 2 {
		t.Fatalf("processed %d messages, want 2", processed)
	}

	var trashed int
	if err := database.QueryRow("SELECT COUNT(*) FROM messages WHERE is_deleted = 1").Scan(&trashed); err != nil {
		t.Fatal(err)
	}
	if trashed != 2 {
		t.Fatalf("found %d trashed messages, want 2", trashed)
	}

	processed, err = trashOrDeleteMessages([]int64{1, 2})
	if err != nil {
		t.Fatal(err)
	}
	if processed != 2 {
		t.Fatalf("processed %d messages, want 2", processed)
	}

	var remaining int
	if err := database.QueryRow("SELECT COUNT(*) FROM messages").Scan(&remaining); err != nil {
		t.Fatal(err)
	}
	if remaining != 0 {
		t.Fatalf("found %d messages after permanent deletion, want 0", remaining)
	}
}
