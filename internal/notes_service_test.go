package internal

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

const notesServiceTestSchema = `
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
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT DEFAULT '',
    file_type TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    sort_order INTEGER DEFAULT 0
);
CREATE TABLE message_tags (
    message_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (message_id, tag_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);`

func newTestNotesService(t *testing.T) *NotesService {
	t.Helper()
	database, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "notes.db")+"?_pragma=foreign_keys(ON)")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close() })
	if _, err := database.Exec(notesServiceTestSchema); err != nil {
		t.Fatal(err)
	}
	return NewNotesService(database, filepath.Join(t.TempDir(), "uploads"))
}

func TestNotesServiceLifecycle(t *testing.T) {
	ctx := context.Background()
	service := newTestNotesService(t)

	created, err := service.CreateNote(ctx, "Plan #Work", []NewAttachment{{
		Filename: "plan.txt",
		Data:     []byte("first attachment"),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID <= 0 || len(created.Tags) != 1 || created.Tags[0] != "work" {
		t.Fatalf("unexpected created note: %+v", created)
	}
	if len(created.Attachments) != 1 {
		t.Fatalf("attachments = %d, want 1", len(created.Attachments))
	}
	originalAttachment := created.Attachments[0]
	originalPath := filepath.Join(service.UploadsDir, originalAttachment.FilePath)
	if data, err := os.ReadFile(originalPath); err != nil || string(data) != "first attachment" {
		t.Fatalf("stored attachment = %q, %v", data, err)
	}

	updated, err := service.UpdateNote(ctx, created.ID, UpdateNoteOptions{
		AppendContent: "Next step",
		Attachments: []NewAttachment{{
			Filename: "next.txt",
			Data:     []byte("second attachment"),
		}},
		DeleteAttachmentIDs: []int64{originalAttachment.ID},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(updated.Content, "Plan #Work\nNext step") {
		t.Fatalf("updated content = %q", updated.Content)
	}
	if len(updated.Attachments) != 1 || updated.Attachments[0].FilePath == originalAttachment.FilePath {
		t.Fatalf("unexpected attachments after update: %+v", updated.Attachments)
	}
	attachment, attachmentData, err := service.GetAttachment(ctx, updated.ID, updated.Attachments[0].ID)
	if err != nil || attachment.ID != updated.Attachments[0].ID || string(attachmentData) != "second attachment" {
		t.Fatalf("GetAttachment = %+v, %q, %v", attachment, attachmentData, err)
	}
	if _, err := os.Stat(originalPath); !os.IsNotExist(err) {
		t.Fatalf("deleted attachment still exists or stat failed unexpectedly: %v", err)
	}

	if affected, err := service.AddTags(ctx, []int64{created.ID}, []string{"Voice"}); err != nil || affected != 1 {
		t.Fatalf("AddTags affected %d: %v", affected, err)
	}
	result, err := service.ListNotes(ctx, ListNotesOptions{Query: "next", Tags: []string{"voice"}, State: "all"})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Notes) != 1 || !strings.Contains(result.Notes[0].Content, "#voice") {
		t.Fatalf("unexpected list result: %+v", result)
	}
	if affected, err := service.SetArchived(ctx, []int64{created.ID}, true); err != nil || affected != 1 {
		t.Fatalf("SetArchived affected %d: %v", affected, err)
	}
	result, err = service.ListNotes(ctx, ListNotesOptions{Query: "next"})
	if err != nil || len(result.Notes) != 1 {
		t.Fatalf("default search did not include archived note: %+v, %v", result, err)
	}

	if affected, err := service.MoveToTrash(ctx, []int64{created.ID}); err != nil || affected != 1 {
		t.Fatalf("MoveToTrash affected %d: %v", affected, err)
	}
	trashed, err := service.GetNote(ctx, created.ID)
	if err != nil || trashed.IsDeleted != 1 {
		t.Fatalf("trashed note = %+v, %v", trashed, err)
	}
	storedPath := filepath.Join(service.UploadsDir, trashed.Attachments[0].FilePath)
	if affected, err := service.DeletePermanently(ctx, []int64{created.ID}); err != nil || affected != 1 {
		t.Fatalf("DeletePermanently affected %d: %v", affected, err)
	}
	if _, err := service.GetNote(ctx, created.ID); err == nil {
		t.Fatal("permanently deleted note is still readable")
	}
	if _, err := os.Stat(storedPath); !os.IsNotExist(err) {
		t.Fatalf("permanently deleted attachment still exists or stat failed unexpectedly: %v", err)
	}
}

func TestDeletePermanentlyRequiresTrash(t *testing.T) {
	ctx := context.Background()
	service := newTestNotesService(t)
	note, err := service.CreateNote(ctx, "keep me", nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.DeletePermanently(ctx, []int64{note.ID}); err == nil {
		t.Fatal("DeletePermanently succeeded for an active note")
	}
	if _, err := service.GetNote(ctx, note.ID); err != nil {
		t.Fatalf("active note disappeared: %v", err)
	}
}
