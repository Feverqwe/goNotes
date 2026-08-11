package internal

import (
	"context"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type mcpAttachmentInput struct {
	Filename   string `json:"filename" jsonschema:"Original filename including its extension"`
	DataBase64 string `json:"data_base64" jsonschema:"File bytes encoded as standard base64"`
}

type mcpListNotesInput struct {
	Query           string   `json:"query,omitempty" jsonschema:"Case-insensitive words that must all occur in the note"`
	Tags            []string `json:"tags,omitempty" jsonschema:"Tags that must all be present; omit the leading #"`
	State           string   `json:"state,omitempty" jsonschema:"One of active, archived, all, or trash. Defaults to active when browsing and all when searching or filtering by tags."`
	Limit           int      `json:"limit,omitempty" jsonschema:"Maximum notes to return, from 1 to 100; defaults to 20"`
	BeforeSortOrder int      `json:"before_sort_order,omitempty" jsonschema:"Pagination cursor returned as next_sort_order by the previous call"`
}

type mcpGetNoteInput struct {
	ID int64 `json:"id" jsonschema:"Exact note ID"`
}

type mcpGetAttachmentInput struct {
	NoteID       int64 `json:"note_id" jsonschema:"Exact note ID"`
	AttachmentID int64 `json:"attachment_id" jsonschema:"Exact attachment ID from note_get"`
}

type mcpCreateNoteInput struct {
	Content     string               `json:"content" jsonschema:"Complete goNotes Markdown content. Put tags in the content as #tags; wrap visually hidden text as ||hidden text||."`
	Attachments []mcpAttachmentInput `json:"attachments,omitempty" jsonschema:"Optional files to attach"`
}

type mcpUpdateNoteInput struct {
	ID                  int64                `json:"id" jsonschema:"Exact note ID"`
	Content             *string              `json:"content,omitempty" jsonschema:"Replacement goNotes Markdown content. Use ||hidden text|| for visually hidden text. May be an empty string."`
	AppendContent       string               `json:"append_content,omitempty" jsonschema:"Text to append on a new line instead of replacing content"`
	Attachments         []mcpAttachmentInput `json:"attachments,omitempty" jsonschema:"Optional new files to attach"`
	DeleteAttachmentIDs []int64              `json:"delete_attachment_ids,omitempty" jsonschema:"IDs of existing attachments to remove"`
}

type mcpIDsInput struct {
	IDs []int64 `json:"ids" jsonschema:"Exact note IDs"`
}

type mcpArchiveInput struct {
	IDs      []int64 `json:"ids" jsonschema:"Exact note IDs"`
	Archived bool    `json:"archived" jsonschema:"True to archive, false to unarchive"`
}

type mcpAddTagsInput struct {
	IDs  []int64  `json:"ids" jsonschema:"Exact note IDs"`
	Tags []string `json:"tags" jsonschema:"Tags to append to note content; omit the leading #"`
}

type mcpSetColorInput struct {
	ID    int64  `json:"id" jsonschema:"Exact note ID"`
	Color string `json:"color" jsonschema:"Color value understood by goNotes; use an empty string to clear"`
}

type mcpSetExpandedInput struct {
	ID       int64 `json:"id" jsonschema:"Exact note ID"`
	Expanded bool  `json:"expanded" jsonschema:"Whether the note card is expanded"`
}

type mcpReorderNotesInput struct {
	IDs []int64 `json:"ids" jsonschema:"All note IDs being reordered, in desired top-to-bottom order"`
}

type mcpReorderTagsInput struct {
	Names []string `json:"names" jsonschema:"All tag names being reordered, in desired top-to-bottom order"`
}

type mcpNoteOutput struct {
	Note MessageDTO `json:"note"`
}

type mcpStatusOutput struct {
	Status   string `json:"status"`
	Affected int64  `json:"affected,omitempty"`
}

type mcpTagsOutput struct {
	Tags []string `json:"tags"`
}

type mcpAttachmentOutput struct {
	Attachment AttachmentDTO `json:"attachment"`
	DataBase64 string        `json:"data_base64"`
}

// HandleMCP mounts a bearer-token protected Streamable HTTP MCP endpoint on
// the running goNotes server.
func HandleMCP(router *Router, service *NotesService, token, version string) {
	server := newMCPServer(service, version)
	handler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{
			Stateless:                    true,
			JSONResponse:                 true,
			MaxRequestBodyBytes:          48 << 20,
			PropagateRequestCancellation: true,
		},
	)
	router.All("/mcp", requireBearerToken(token, handler).ServeHTTP)
}

func newMCPServer(service *NotesService, version string) *mcp.Server {
	server := mcp.NewServer(
		&mcp.Implementation{Name: "goNotes", Version: version},
		&mcp.ServerOptions{Instructions: strings.TrimSpace(`
goNotes stores Markdown notes whose hashtags are part of their content. It also supports custom spoiler syntax: wrap text as ||hidden text|| to mask it in the UI until clicked. This is visual concealment only, not encryption; the text remains stored as plaintext and visible through MCP. Preserve this syntax when editing notes and use it when the user asks to hide content. Always use notes_list or note_get to resolve exact IDs before changing existing notes. Never guess an ID. Prefer note_update with append_content when the user asks to add information. Moving to trash is reversible; notes_delete_permanently is irreversible and only affects notes already in trash, so obtain explicit user confirmation immediately before calling it. Attachments are sent as base64 and are limited to 32 MiB decoded per tool call.`)},
	)

	mcp.AddTool(server, readOnlyTool("notes_list", "Search and list notes with tag, state, and cursor filters."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpListNotesInput) (*mcp.CallToolResult, ListNotesResult, error) {
			if input.Limit > 100 {
				input.Limit = 100
			}
			output, err := service.ListNotes(ctx, ListNotesOptions{
				Query: input.Query, Tags: input.Tags, State: input.State, Limit: input.Limit,
				BeforeSortOrder: input.BeforeSortOrder,
			})
			return nil, output, err
		})

	mcp.AddTool(server, readOnlyTool("note_get", "Get one note by its exact ID, including notes in trash and all attachment metadata."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpGetNoteInput) (*mcp.CallToolResult, mcpNoteOutput, error) {
			note, err := service.GetNote(ctx, input.ID)
			return nil, mcpNoteOutput{Note: note}, err
		})

	mcp.AddTool(server, readOnlyTool("attachment_get", "Read an attachment by its note ID and attachment ID. Returns up to 32 MiB as standard base64."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpGetAttachmentInput) (*mcp.CallToolResult, mcpAttachmentOutput, error) {
			attachment, data, err := service.GetAttachment(ctx, input.NoteID, input.AttachmentID)
			return nil, mcpAttachmentOutput{
				Attachment: attachment,
				DataBase64: base64.StdEncoding.EncodeToString(data),
			}, err
		})

	mcp.AddTool(server, writeTool("note_create", "Create a Markdown note, optionally with attachments. Hashtags in content become goNotes tags.", false, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpCreateNoteInput) (*mcp.CallToolResult, mcpNoteOutput, error) {
			attachments, err := decodeMCPAttachments(input.Attachments)
			if err != nil {
				return nil, mcpNoteOutput{}, err
			}
			note, err := service.CreateNote(ctx, input.Content, attachments)
			return nil, mcpNoteOutput{Note: note}, err
		})

	mcp.AddTool(server, writeTool("note_update", "Replace or append note content and add or remove attachments. Use either content or append_content, not both.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpUpdateNoteInput) (*mcp.CallToolResult, mcpNoteOutput, error) {
			attachments, err := decodeMCPAttachments(input.Attachments)
			if err != nil {
				return nil, mcpNoteOutput{}, err
			}
			note, err := service.UpdateNote(ctx, input.ID, UpdateNoteOptions{
				Content: input.Content, AppendContent: input.AppendContent, Attachments: attachments,
				DeleteAttachmentIDs: input.DeleteAttachmentIDs,
			})
			return nil, mcpNoteOutput{Note: note}, err
		})

	mcp.AddTool(server, writeTool("notes_set_archived", "Archive or unarchive one or more notes.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpArchiveInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			affected, err := service.SetArchived(ctx, input.IDs, input.Archived)
			return nil, mcpStatusOutput{Status: "ok", Affected: affected}, err
		})

	mcp.AddTool(server, writeTool("notes_move_to_trash", "Move active or archived notes to trash. This operation is reversible and never permanently deletes notes.", true, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpIDsInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			affected, err := service.MoveToTrash(ctx, input.IDs)
			return nil, mcpStatusOutput{Status: "ok", Affected: affected}, err
		})

	mcp.AddTool(server, writeTool("notes_restore", "Restore one or more notes from trash.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpIDsInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			affected, err := service.Restore(ctx, input.IDs)
			return nil, mcpStatusOutput{Status: "ok", Affected: affected}, err
		})

	mcp.AddTool(server, writeTool("notes_delete_permanently", "Permanently delete notes that are already in trash and remove their attachment files. Irreversible; confirm with the user immediately before calling.", true, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpIDsInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			affected, err := service.DeletePermanently(ctx, input.IDs)
			return nil, mcpStatusOutput{Status: "ok", Affected: affected}, err
		})

	mcp.AddTool(server, writeTool("notes_add_tags", "Add tags to notes. Missing #tags are appended to note content so content and tag indexes remain consistent.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpAddTagsInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			affected, err := service.AddTags(ctx, input.IDs, input.Tags)
			return nil, mcpStatusOutput{Status: "ok", Affected: int64(affected)}, err
		})

	mcp.AddTool(server, writeTool("note_set_color", "Set or clear a note color.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpSetColorInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.SetColor(ctx, input.ID, input.Color)
			return nil, mcpStatusOutput{Status: "ok", Affected: 1}, err
		})

	mcp.AddTool(server, writeTool("notes_reorder", "Reorder notes. IDs are interpreted in desired top-to-bottom order.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpReorderNotesInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.ReorderNotes(ctx, input.IDs)
			return nil, mcpStatusOutput{Status: "ok", Affected: int64(len(input.IDs))}, err
		})

	mcp.AddTool(server, writeTool("note_mark_used", "Update only the note used_at timestamp, for example after the user copies or uses it.", false, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpGetNoteInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.MarkUsed(ctx, input.ID)
			return nil, mcpStatusOutput{Status: "ok", Affected: 1}, err
		})

	mcp.AddTool(server, writeTool("note_set_expanded", "Set the persisted expanded state of a note card.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpSetExpandedInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.SetExpanded(ctx, input.ID, input.Expanded)
			return nil, mcpStatusOutput{Status: "ok", Affected: 1}, err
		})

	mcp.AddTool(server, readOnlyTool("tags_list", "List tags currently used by notes in navigation order."),
		func(ctx context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, mcpTagsOutput, error) {
			tags, err := service.ListTags(ctx)
			return nil, mcpTagsOutput{Tags: tags}, err
		})

	mcp.AddTool(server, writeTool("tags_reorder", "Reorder tags. Names are interpreted in desired top-to-bottom order.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpReorderTagsInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.ReorderTags(ctx, input.Names)
			return nil, mcpStatusOutput{Status: "ok", Affected: int64(len(input.Names))}, err
		})

	return server
}

func decodeMCPAttachments(inputs []mcpAttachmentInput) ([]NewAttachment, error) {
	attachments := make([]NewAttachment, 0, len(inputs))
	total := 0
	for _, input := range inputs {
		if strings.TrimSpace(input.Filename) == "" {
			return nil, errors.New("attachment filename is required")
		}
		data, err := base64.StdEncoding.DecodeString(input.DataBase64)
		if err != nil {
			return nil, fmt.Errorf("attachment %q has invalid base64 data: %w", input.Filename, err)
		}
		total += len(data)
		if total > maxIntegrationAttachmentBytes {
			return nil, fmt.Errorf("attachments exceed the %d MiB decoded limit", maxIntegrationAttachmentBytes>>20)
		}
		attachments = append(attachments, NewAttachment{Filename: input.Filename, Data: data})
	}
	return attachments, nil
}

func requireBearerToken(token string, next http.Handler) http.Handler {
	expected := []byte("Bearer " + token)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		actual := []byte(r.Header.Get("Authorization"))
		if len(actual) != len(expected) || subtle.ConstantTimeCompare(actual, expected) != 1 {
			w.Header().Set("WWW-Authenticate", `Bearer realm="goNotes MCP"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func readOnlyTool(name, description string) *mcp.Tool {
	openWorld := false
	return &mcp.Tool{
		Name: name, Description: description,
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: true, IdempotentHint: true, OpenWorldHint: &openWorld},
	}
}

func writeTool(name, description string, destructive, idempotent bool) *mcp.Tool {
	openWorld := false
	return &mcp.Tool{
		Name: name, Description: description,
		Annotations: &mcp.ToolAnnotations{
			DestructiveHint: &destructive, IdempotentHint: idempotent, OpenWorldHint: &openWorld,
		},
	}
}
