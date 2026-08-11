package internal

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const maxIntegrationAttachmentBytes = 32 << 20

// NotesService exposes the notes domain without depending on an HTTP contract.
// It lets integrations such as the remote MCP endpoint share the running app's
// database and attachment storage.
type NotesService struct {
	DB         *sql.DB
	UploadsDir string
}

type ListNotesOptions struct {
	ID              int64
	Query           string
	Tags            []string
	State           string
	Limit           int
	BeforeSortOrder int
	BeforeArchived  int
	GroupByArchived bool
}

type ListNotesResult struct {
	Notes         []MessageDTO `json:"notes"`
	NextSortOrder *int         `json:"next_sort_order,omitempty"`
}

type UpdateNoteOptions struct {
	Content             *string
	AppendContent       string
	Attachments         []NewAttachment
	DeleteAttachmentIDs []int64
}

type NewAttachment struct {
	Filename string
	Data     []byte
	Open     func() (io.ReadCloser, error)
}

func (s *NotesService) GetAttachment(ctx context.Context, noteID, attachmentID int64) (AttachmentDTO, []byte, error) {
	if noteID <= 0 || attachmentID <= 0 {
		return AttachmentDTO{}, nil, errors.New("note id and attachment id must be positive")
	}
	var attachment AttachmentDTO
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, file_path, thumbnail_path, file_type
		FROM attachments WHERE id = ? AND message_id = ?`, attachmentID, noteID).Scan(
		&attachment.ID, &attachment.FilePath, &attachment.ThumbnailPath, &attachment.FileType,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return AttachmentDTO{}, nil, fmt.Errorf("attachment %d not found on note %d", attachmentID, noteID)
	}
	if err != nil {
		return AttachmentDTO{}, nil, err
	}
	data, err := os.ReadFile(filepath.Join(s.UploadsDir, filepath.Base(attachment.FilePath)))
	if err != nil {
		return AttachmentDTO{}, nil, err
	}
	if len(data) > maxIntegrationAttachmentBytes {
		return AttachmentDTO{}, nil, fmt.Errorf("attachment exceeds the %d MiB integration limit", maxIntegrationAttachmentBytes>>20)
	}
	return attachment, data, nil
}

func NewNotesService(database *sql.DB, uploadsDir string) *NotesService {
	return &NotesService{DB: database, UploadsDir: uploadsDir}
}

func (s *NotesService) ListNotes(ctx context.Context, opts ListNotesOptions) (ListNotesResult, error) {
	if opts.Limit <= 0 {
		opts.Limit = 20
	}

	var clauses []string
	var args []any
	state := opts.State
	if state == "" {
		state = "active"
		if strings.TrimSpace(opts.Query) != "" || len(opts.Tags) > 0 {
			state = "all"
		}
	}
	switch state {
	case "active":
		clauses = append(clauses, "is_deleted = 0", "is_archived = 0")
	case "archived":
		clauses = append(clauses, "is_deleted = 0", "is_archived = 1")
	case "all":
		clauses = append(clauses, "is_deleted = 0")
	case "trash":
		clauses = append(clauses, "is_deleted = 1")
	default:
		return ListNotesResult{}, fmt.Errorf("invalid state %q: use active, archived, all, or trash", opts.State)
	}
	if opts.ID > 0 {
		clauses = append(clauses, "id = ?")
		args = append(args, opts.ID)
	}

	for _, word := range strings.Fields(strings.TrimSpace(opts.Query)) {
		clauses = append(clauses, "content_lower LIKE ?")
		args = append(args, "%"+strings.ToLower(word)+"%")
	}

	if len(opts.Tags) > 0 {
		tags, err := normalizeTagNames(opts.Tags)
		if err != nil {
			return ListNotesResult{}, err
		}
		if len(tags) > 0 {
			clauses = append(clauses, fmt.Sprintf(`id IN (
				SELECT message_id FROM message_tags mt
				JOIN tags t ON mt.tag_id = t.id
				WHERE t.name IN (%s)
				GROUP BY message_id
				HAVING COUNT(DISTINCT t.name) = ?
			)`, generatePlaceholders(len(tags))))
			for _, tag := range tags {
				args = append(args, tag)
			}
			args = append(args, len(tags))
		}
	}

	if opts.BeforeSortOrder > 0 {
		if opts.GroupByArchived {
			clauses = append(clauses, "(is_archived > ? OR (is_archived = ? AND sort_order < ?))")
			args = append(args, opts.BeforeArchived, opts.BeforeArchived, opts.BeforeSortOrder)
		} else {
			clauses = append(clauses, "sort_order < ?")
			args = append(args, opts.BeforeSortOrder)
		}
	}

	args = append(args, opts.Limit+1)
	orderSQL := "sort_order DESC, id DESC"
	if opts.GroupByArchived {
		orderSQL = "is_archived ASC, sort_order DESC, id DESC"
	}
	query := fmt.Sprintf(`
		SELECT id, COALESCE(content, ''), created_at, updated_at, used_at,
		       is_archived, is_deleted, is_expanded, sort_order, color
		FROM messages
		WHERE %s
		ORDER BY %s
		LIMIT ?`, strings.Join(clauses, " AND "), orderSQL)

	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return ListNotesResult{}, err
	}
	defer rows.Close()

	notes := make([]MessageDTO, 0, opts.Limit)
	ids := make([]int64, 0, opts.Limit)
	for rows.Next() {
		var note MessageDTO
		if err := rows.Scan(
			&note.ID, &note.Content, &note.CreatedAt, &note.UpdatedAt, &note.UsedAt,
			&note.IsArchived, &note.IsDeleted, &note.IsExpanded, &note.SortOrder, &note.Color,
		); err != nil {
			return ListNotesResult{}, err
		}
		note.Tags = []string{}
		note.Attachments = []AttachmentDTO{}
		notes = append(notes, note)
		ids = append(ids, note.ID)
	}
	if err := rows.Err(); err != nil {
		return ListNotesResult{}, err
	}

	var next *int
	if len(notes) > opts.Limit {
		nextValue := notes[opts.Limit-1].SortOrder
		next = &nextValue
		notes = notes[:opts.Limit]
		ids = ids[:opts.Limit]
	}
	if err := s.populateRelations(ctx, notes, ids); err != nil {
		return ListNotesResult{}, err
	}

	return ListNotesResult{Notes: notes, NextSortOrder: next}, nil
}

func (s *NotesService) GetNote(ctx context.Context, id int64) (MessageDTO, error) {
	if id <= 0 {
		return MessageDTO{}, errors.New("note id must be positive")
	}
	var note MessageDTO
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, COALESCE(content, ''), created_at, updated_at, used_at,
		       is_archived, is_deleted, is_expanded, sort_order, color
		FROM messages WHERE id = ?`, id).Scan(
		&note.ID, &note.Content, &note.CreatedAt, &note.UpdatedAt, &note.UsedAt,
		&note.IsArchived, &note.IsDeleted, &note.IsExpanded, &note.SortOrder, &note.Color,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return MessageDTO{}, fmt.Errorf("note %d not found", id)
	}
	if err != nil {
		return MessageDTO{}, err
	}
	note.Tags = []string{}
	note.Attachments = []AttachmentDTO{}
	notes := []MessageDTO{note}
	if err := s.populateRelations(ctx, notes, []int64{id}); err != nil {
		return MessageDTO{}, err
	}
	return notes[0], nil
}

func (s *NotesService) CreateNote(ctx context.Context, content string, attachments []NewAttachment) (MessageDTO, error) {
	content = normalizeNewlines(content)
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return MessageDTO{}, err
	}
	defer tx.Rollback()

	var maxOrder int
	if err := tx.QueryRowContext(ctx, "SELECT COALESCE(MAX(sort_order), 0) FROM messages").Scan(&maxOrder); err != nil {
		return MessageDTO{}, err
	}
	res, err := tx.ExecContext(ctx,
		"INSERT INTO messages (content, content_lower, sort_order) VALUES (?, ?, ?)",
		content, strings.ToLower(content), maxOrder+1,
	)
	if err != nil {
		return MessageDTO{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return MessageDTO{}, err
	}

	createdFiles, err := s.addAttachments(ctx, tx, id, attachments)
	if err != nil {
		s.removeStoredFiles(createdFiles)
		return MessageDTO{}, err
	}
	if err := syncMessageTags(ctx, tx, id, content); err != nil {
		s.removeStoredFiles(createdFiles)
		return MessageDTO{}, err
	}
	if err := tx.Commit(); err != nil {
		s.removeStoredFiles(createdFiles)
		return MessageDTO{}, err
	}
	return s.GetNote(ctx, id)
}

func (s *NotesService) UpdateNote(ctx context.Context, id int64, opts UpdateNoteOptions) (MessageDTO, error) {
	if id <= 0 {
		return MessageDTO{}, errors.New("note id must be positive")
	}
	if opts.Content != nil && opts.AppendContent != "" {
		return MessageDTO{}, errors.New("content and append_content cannot be used together")
	}
	if opts.Content == nil && opts.AppendContent == "" && len(opts.Attachments) == 0 && len(opts.DeleteAttachmentIDs) == 0 {
		return MessageDTO{}, errors.New("no note changes were provided")
	}

	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return MessageDTO{}, err
	}
	defer tx.Rollback()

	var content string
	if err := tx.QueryRowContext(ctx, "SELECT COALESCE(content, '') FROM messages WHERE id = ?", id).Scan(&content); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MessageDTO{}, fmt.Errorf("note %d not found", id)
		}
		return MessageDTO{}, err
	}
	contentChanged := false
	if opts.Content != nil {
		content = normalizeNewlines(*opts.Content)
		contentChanged = true
	} else if opts.AppendContent != "" {
		addition := normalizeNewlines(opts.AppendContent)
		if content != "" && !strings.HasSuffix(content, "\n") {
			content += "\n"
		}
		content += addition
		contentChanged = true
	}

	if contentChanged {
		if _, err := tx.ExecContext(ctx,
			"UPDATE messages SET content = ?, content_lower = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			content, strings.ToLower(content), id,
		); err != nil {
			return MessageDTO{}, err
		}
		if err := syncMessageTags(ctx, tx, id, content); err != nil {
			return MessageDTO{}, err
		}
	}

	filesToDelete, err := s.removeAttachmentRecords(ctx, tx, id, opts.DeleteAttachmentIDs)
	if err != nil {
		return MessageDTO{}, err
	}
	createdFiles, err := s.addAttachments(ctx, tx, id, opts.Attachments)
	if err != nil {
		s.removeStoredFiles(createdFiles)
		return MessageDTO{}, err
	}
	if !contentChanged && (len(opts.Attachments) > 0 || len(opts.DeleteAttachmentIDs) > 0) {
		if _, err := tx.ExecContext(ctx, "UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", id); err != nil {
			s.removeStoredFiles(createdFiles)
			return MessageDTO{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		s.removeStoredFiles(createdFiles)
		return MessageDTO{}, err
	}
	s.removeStoredFiles(filesToDelete)
	return s.GetNote(ctx, id)
}

func (s *NotesService) MoveToTrash(ctx context.Context, ids []int64) (int64, error) {
	return s.updateIDs(ctx, ids, "UPDATE messages SET is_deleted = 1 WHERE is_deleted = 0 AND id IN (%s)")
}

// TrashOrDelete preserves the web API's two-stage delete contract: notes not
// yet in trash are moved there, while notes already in trash are permanently
// deleted together with their attachment files.
func (s *NotesService) TrashOrDelete(ctx context.Context, ids []int64) (int64, error) {
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return 0, err
	}
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx,
		fmt.Sprintf("SELECT id, is_deleted FROM messages WHERE id IN (%s)", generatePlaceholders(len(ids))),
		args...,
	)
	if err != nil {
		return 0, err
	}
	var toTrash, toDelete []int64
	for rows.Next() {
		var id int64
		var deleted int
		if err := rows.Scan(&id, &deleted); err != nil {
			rows.Close()
			return 0, err
		}
		if deleted == 1 {
			toDelete = append(toDelete, id)
		} else {
			toTrash = append(toTrash, id)
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	if err := rows.Close(); err != nil {
		return 0, err
	}

	var files []string
	if len(toDelete) > 0 {
		deletedFiles, _, err := deleteMessageRecords(ctx, tx, toDelete)
		if err != nil {
			return 0, err
		}
		files = append(files, deletedFiles...)
	}
	if len(toTrash) > 0 {
		trashArgs := idsToArgs(toTrash)
		if _, err := tx.ExecContext(ctx,
			fmt.Sprintf("UPDATE messages SET is_deleted = 1 WHERE id IN (%s)", generatePlaceholders(len(toTrash))),
			trashArgs...,
		); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	s.removeStoredFiles(files)
	return int64(len(toTrash) + len(toDelete)), nil
}

func (s *NotesService) Restore(ctx context.Context, ids []int64) (int64, error) {
	return s.updateIDs(ctx, ids, "UPDATE messages SET is_deleted = 0 WHERE is_deleted = 1 AND id IN (%s)")
}

func (s *NotesService) SetArchived(ctx context.Context, ids []int64, archived bool) (int64, error) {
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return 0, err
	}
	flag := 0
	if archived {
		flag = 1
	}
	query := fmt.Sprintf("UPDATE messages SET is_archived = ? WHERE id IN (%s)", generatePlaceholders(len(ids)))
	args = append([]any{flag}, args...)
	res, err := s.DB.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (s *NotesService) DeletePermanently(ctx context.Context, ids []int64) (int64, error) {
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return 0, err
	}
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var deletable int
	if err := tx.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM messages WHERE is_deleted = 1 AND id IN (%s)", generatePlaceholders(len(ids))),
		args...,
	).Scan(&deletable); err != nil {
		return 0, err
	}
	if deletable != len(ids) {
		return 0, errors.New("every note must exist and already be in trash before permanent deletion")
	}

	files, affected, err := deleteMessageRecords(ctx, tx, ids)
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	s.removeStoredFiles(files)
	return affected, nil
}

func (s *NotesService) AddTags(ctx context.Context, ids []int64, rawTags []string) (int, error) {
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return 0, err
	}
	tags, err := normalizeTagNames(rawTags)
	if err != nil {
		return 0, err
	}
	if len(tags) == 0 {
		return 0, errors.New("at least one tag is required")
	}

	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	rows, err := tx.QueryContext(ctx,
		fmt.Sprintf("SELECT id, COALESCE(content, '') FROM messages WHERE id IN (%s)", generatePlaceholders(len(ids))),
		args...,
	)
	if err != nil {
		return 0, err
	}
	type noteContent struct {
		id      int64
		content string
	}
	var notes []noteContent
	for rows.Next() {
		var note noteContent
		if err := rows.Scan(&note.id, &note.content); err != nil {
			rows.Close()
			return 0, err
		}
		notes = append(notes, note)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	if err := rows.Close(); err != nil {
		return 0, err
	}

	for _, note := range notes {
		content := addTagsToContent(note.content, tags)
		if content != note.content {
			if _, err := tx.ExecContext(ctx,
				"UPDATE messages SET content = ?, content_lower = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
				content, strings.ToLower(content), note.id,
			); err != nil {
				return 0, err
			}
		}
		if err := syncMessageTags(ctx, tx, note.id, content); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(notes), nil
}

func (s *NotesService) SetColor(ctx context.Context, id int64, color string) error {
	return s.updateOne(ctx, id, "UPDATE messages SET color = ? WHERE id = ?", color)
}

func (s *NotesService) MarkUsed(ctx context.Context, id int64) error {
	return s.updateOne(ctx, id, "UPDATE messages SET used_at = CURRENT_TIMESTAMP WHERE id = ?")
}

func (s *NotesService) SetExpanded(ctx context.Context, id int64, expanded bool) error {
	flag := 0
	if expanded {
		flag = 1
	}
	return s.updateOne(ctx, id, "UPDATE messages SET is_expanded = ? WHERE id = ?", flag)
}

func (s *NotesService) ReorderNotes(ctx context.Context, ids []int64) error {
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return err
	}
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	rows, err := tx.QueryContext(ctx,
		fmt.Sprintf("SELECT sort_order FROM messages WHERE id IN (%s) ORDER BY sort_order DESC", generatePlaceholders(len(ids))),
		args...,
	)
	if err != nil {
		return err
	}
	var orders []int
	for rows.Next() {
		var order int
		if err := rows.Scan(&order); err != nil {
			rows.Close()
			return err
		}
		orders = append(orders, order)
	}
	if err := rows.Close(); err != nil {
		return err
	}
	if len(orders) != len(ids) {
		return errors.New("one or more notes were not found")
	}
	for i, id := range ids {
		if _, err := tx.ExecContext(ctx, "UPDATE messages SET sort_order = ? WHERE id = ?", orders[i], id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *NotesService) ListTags(ctx context.Context) ([]string, error) {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT DISTINCT t.name
		FROM tags t JOIN message_tags mt ON t.id = mt.tag_id
		ORDER BY t.sort_order DESC, t.name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tags := []string{}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func (s *NotesService) ReorderTags(ctx context.Context, names []string) error {
	if len(names) == 0 {
		return errors.New("at least one tag is required")
	}
	tags, err := normalizeTagNames(names)
	if err != nil {
		return err
	}
	if len(tags) != len(names) {
		return errors.New("tag list contains duplicates")
	}
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, tag := range tags {
		res, err := tx.ExecContext(ctx, "UPDATE tags SET sort_order = ? WHERE name = ?", len(tags)-i, tag)
		if err != nil {
			return err
		}
		if affected, _ := res.RowsAffected(); affected == 0 {
			return fmt.Errorf("tag %q not found", tag)
		}
	}
	return tx.Commit()
}

func (s *NotesService) populateRelations(ctx context.Context, notes []MessageDTO, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	args := make([]any, len(ids))
	index := make(map[int64]int, len(ids))
	for i, id := range ids {
		args[i] = id
		index[id] = i
	}

	tagRows, err := s.DB.QueryContext(ctx, fmt.Sprintf(`
		SELECT mt.message_id, t.name
		FROM message_tags mt JOIN tags t ON mt.tag_id = t.id
		WHERE mt.message_id IN (%s)
		ORDER BY t.name`, generatePlaceholders(len(ids))), args...)
	if err != nil {
		return err
	}
	for tagRows.Next() {
		var id int64
		var tag string
		if err := tagRows.Scan(&id, &tag); err != nil {
			tagRows.Close()
			return err
		}
		if i, ok := index[id]; ok {
			notes[i].Tags = append(notes[i].Tags, tag)
		}
	}
	if err := tagRows.Err(); err != nil {
		tagRows.Close()
		return err
	}
	if err := tagRows.Close(); err != nil {
		return err
	}

	attachmentRows, err := s.DB.QueryContext(ctx, fmt.Sprintf(`
		SELECT message_id, id, file_path, thumbnail_path, file_type
		FROM attachments WHERE message_id IN (%s)
		ORDER BY id`, generatePlaceholders(len(ids))), args...)
	if err != nil {
		return err
	}
	defer attachmentRows.Close()
	for attachmentRows.Next() {
		var id int64
		var attachment AttachmentDTO
		if err := attachmentRows.Scan(
			&id, &attachment.ID, &attachment.FilePath, &attachment.ThumbnailPath, &attachment.FileType,
		); err != nil {
			return err
		}
		if i, ok := index[id]; ok {
			notes[i].Attachments = append(notes[i].Attachments, attachment)
		}
	}
	return attachmentRows.Err()
}

func (s *NotesService) addAttachments(ctx context.Context, tx *sql.Tx, noteID int64, attachments []NewAttachment) ([]string, error) {
	if len(attachments) == 0 {
		return nil, nil
	}
	if err := os.MkdirAll(s.UploadsDir, 0755); err != nil {
		return nil, err
	}
	var created []string
	for _, attachment := range attachments {
		source, err := attachment.open()
		if err != nil {
			return created, fmt.Errorf("attachment %q: %w", attachment.Filename, err)
		}
		storedName, saveErr := saveReader(source, attachment.Filename, s.UploadsDir)
		closeErr := source.Close()
		if saveErr != nil {
			return created, saveErr
		}
		created = append(created, storedName)
		if closeErr != nil {
			return created, closeErr
		}

		fileType := "document"
		thumbnailName := ""
		if isImage(storedName) {
			fileType = "image"
			thumbnailName = "thumb_" + storedName
			if err := generateThumbnail(
				filepath.Join(s.UploadsDir, storedName),
				filepath.Join(s.UploadsDir, thumbnailName),
			); err != nil {
				thumbnailName = ""
			} else {
				created = append(created, thumbnailName)
			}
		} else if isAudio(storedName) {
			fileType = "audio"
		} else if isVideo(storedName) {
			fileType = "video"
		}
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO attachments (message_id, file_path, thumbnail_path, file_type) VALUES (?, ?, ?, ?)",
			noteID, storedName, thumbnailName, fileType,
		); err != nil {
			return created, err
		}
	}
	return created, nil
}

func (s *NotesService) removeAttachmentRecords(ctx context.Context, tx *sql.Tx, noteID int64, ids []int64) ([]string, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return nil, err
	}
	queryArgs := append([]any{noteID}, args...)
	rows, err := tx.QueryContext(ctx, fmt.Sprintf(`
		SELECT file_path, thumbnail_path FROM attachments
		WHERE message_id = ? AND id IN (%s)`, generatePlaceholders(len(ids))), queryArgs...)
	if err != nil {
		return nil, err
	}
	var files []string
	found := 0
	for rows.Next() {
		var filePath, thumbnailPath string
		if err := rows.Scan(&filePath, &thumbnailPath); err != nil {
			rows.Close()
			return nil, err
		}
		files = append(files, filePath)
		found++
		if thumbnailPath != "" {
			files = append(files, thumbnailPath)
		}
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if found != len(ids) {
		return nil, errors.New("one or more requested attachments do not belong to this note")
	}
	if _, err := tx.ExecContext(ctx,
		fmt.Sprintf("DELETE FROM attachments WHERE message_id = ? AND id IN (%s)", generatePlaceholders(len(ids))),
		queryArgs...,
	); err != nil {
		return nil, err
	}
	return files, nil
}

func (s *NotesService) removeStoredFiles(names []string) {
	for _, name := range names {
		if name == "" {
			continue
		}
		_ = os.Remove(filepath.Join(s.UploadsDir, filepath.Base(name)))
	}
}

func deleteMessageRecords(ctx context.Context, tx *sql.Tx, ids []int64) ([]string, int64, error) {
	args := idsToArgs(ids)
	rows, err := tx.QueryContext(ctx, fmt.Sprintf(`
		SELECT file_path, thumbnail_path FROM attachments
		WHERE message_id IN (%s)`, generatePlaceholders(len(ids))), args...)
	if err != nil {
		return nil, 0, err
	}
	var files []string
	for rows.Next() {
		var filePath, thumbnailPath string
		if err := rows.Scan(&filePath, &thumbnailPath); err != nil {
			rows.Close()
			return nil, 0, err
		}
		files = append(files, filePath)
		if thumbnailPath != "" {
			files = append(files, thumbnailPath)
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, 0, err
	}
	if err := rows.Close(); err != nil {
		return nil, 0, err
	}
	result, err := tx.ExecContext(ctx,
		fmt.Sprintf("DELETE FROM messages WHERE id IN (%s)", generatePlaceholders(len(ids))),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, 0, err
	}
	return files, affected, nil
}

func (s *NotesService) updateIDs(ctx context.Context, ids []int64, queryTemplate string) (int64, error) {
	ids, args, err := prepareIDs(ids)
	if err != nil {
		return 0, err
	}
	res, err := s.DB.ExecContext(ctx, fmt.Sprintf(queryTemplate, generatePlaceholders(len(ids))), args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (s *NotesService) updateOne(ctx context.Context, id int64, query string, args ...any) error {
	if id <= 0 {
		return errors.New("note id must be positive")
	}
	args = append(args, id)
	res, err := s.DB.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		return fmt.Errorf("note %d not found", id)
	}
	return nil
}

func prepareIDs(ids []int64) ([]int64, []any, error) {
	if len(ids) == 0 {
		return nil, nil, errors.New("at least one note id is required")
	}
	unique := make([]int64, 0, len(ids))
	args := make([]any, 0, len(ids))
	seen := make(map[int64]struct{}, len(ids))
	for _, id := range ids {
		if id <= 0 {
			return nil, nil, errors.New("note ids must be positive")
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
		args = append(args, id)
	}
	return unique, args, nil
}

func idsToArgs(ids []int64) []any {
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	return args
}

func normalizeTagNames(tags []string) ([]string, error) {
	seen := make(map[string]struct{}, len(tags))
	normalized := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.ToLower(strings.TrimSpace(tag))
		extracted := extractHashtags("#" + tag)
		if len(extracted) != 1 || extracted[0] != tag {
			return nil, fmt.Errorf("invalid tag: %q", tag)
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		normalized = append(normalized, tag)
	}
	return normalized, nil
}

func addTagsToContent(content string, tags []string) string {
	existing := make(map[string]struct{})
	for _, tag := range extractHashtags(content) {
		existing[tag] = struct{}{}
	}
	for _, tag := range tags {
		if _, ok := existing[tag]; ok {
			continue
		}
		if content != "" && !strings.HasSuffix(content, "\n") {
			content += "\n"
		}
		content += "#" + tag
		existing[tag] = struct{}{}
	}
	return content
}

func syncMessageTags(ctx context.Context, tx *sql.Tx, noteID int64, content string) error {
	if _, err := tx.ExecContext(ctx, "DELETE FROM message_tags WHERE message_id = ?", noteID); err != nil {
		return err
	}
	for _, tag := range extractHashtags(content) {
		if _, err := tx.ExecContext(ctx, "INSERT OR IGNORE INTO tags (name) VALUES (?)", tag); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO message_tags (message_id, tag_id) SELECT ?, id FROM tags WHERE name = ?",
			noteID, tag,
		); err != nil {
			return err
		}
	}
	return nil
}

func normalizeNewlines(content string) string {
	return strings.ReplaceAll(content, "\r\n", "\n")
}

func (a NewAttachment) open() (io.ReadCloser, error) {
	if a.Open != nil {
		return a.Open()
	}
	return io.NopCloser(bytes.NewReader(a.Data)), nil
}
