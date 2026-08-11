package internal

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/NYTimes/gziphandler"
)

type ActionAny[T any] func() (T, error)

type JsonFailResponse struct {
	Error string `json:"error"`
}

type JsonSuccessResponse struct {
	Result any `json:"result"`
}

func HandleApi(router *Router, service *NotesService) {
	apiRouter := NewRouter()
	gzipHandler := gziphandler.GzipHandler(apiRouter)

	handleAction(apiRouter, service)

	apiRouter.Use(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})
	router.All("^/api/", gzipHandler.ServeHTTP)
}

func handleAction(router *Router, service *NotesService) {
	router.Get("/api/messages/list", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]MessageDTO, error) {
			query := r.URL.Query()
			limit, _ := strconv.Atoi(query.Get("limit"))
			if limit <= 0 {
				limit = 15
			}
			lastOrder, _ := strconv.Atoi(query.Get("last_order"))
			lastArchived, _ := strconv.Atoi(query.Get("last_archived"))
			noteID, _ := strconv.ParseInt(query.Get("id"), 10, 64)
			tagsParam := query.Get("tags")
			searchQuery := strings.TrimSpace(query.Get("q"))
			onlyArchived := query.Get("archived") == "1"
			onlyDeleted := query.Get("deleted") == "1"

			var tags []string
			if tagsParam != "" {
				tags = strings.Split(tagsParam, ",")
			}
			if noteID > 0 {
				searchQuery = ""
				tags = nil
				lastOrder = 0
			}
			state := "active"
			switch {
			case onlyDeleted:
				state = "trash"
			case noteID > 0, searchQuery != "", tagsParam != "":
				state = "all"
			case onlyArchived:
				state = "archived"
			}
			result, err := service.ListNotes(r.Context(), ListNotesOptions{
				ID: noteID, Query: searchQuery, Tags: tags, State: state, Limit: limit,
				BeforeSortOrder: lastOrder, BeforeArchived: lastArchived,
				GroupByArchived: noteID == 0 && tagsParam != "" && !onlyDeleted,
			})
			return result.Notes, err
		})
	})

	type sendMessageResponse struct {
		ID int64 `json:"id"`
	}

	router.Post("/api/messages/send", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (sendMessageResponse, error) {
			if err := r.ParseMultipartForm(32 << 20); err != nil {
				return sendMessageResponse{}, err
			}
			note, err := service.CreateNote(
				r.Context(),
				r.FormValue("content"),
				newMultipartAttachments(r.MultipartForm.File["attachments"]),
			)
			return sendMessageResponse{ID: note.ID}, err
		})
	})

	router.Post("/api/messages/update", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			if err := r.ParseMultipartForm(32 << 20); err != nil {
				return "", err
			}
			id, err := strconv.ParseInt(r.FormValue("id"), 10, 64)
			if err != nil || id <= 0 {
				return "", errors.New("missing ID")
			}
			deleteAttachmentIDs, err := parseCommaSeparatedIDs(r.FormValue("delete_attachments"))
			if err != nil {
				return "", err
			}
			content := r.FormValue("content")
			_, err = service.UpdateNote(r.Context(), id, UpdateNoteOptions{
				Content:             &content,
				Attachments:         newMultipartAttachments(r.MultipartForm.File["attachments"]),
				DeleteAttachmentIDs: deleteAttachmentIDs,
			})
			return "ok", err
		})
	})

	router.Post("/api/messages/use", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				ID int64 `json:"id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			return "ok", service.MarkUsed(r.Context(), data.ID)
		})
	})

	router.Post("/api/messages/set-expanded", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				ID       int64 `json:"id"`
				Expanded int   `json:"expanded"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			return "ok", service.SetExpanded(r.Context(), data.ID, data.Expanded == 1)
		})
	})

	router.Delete("/api/messages/delete", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			id, err := strconv.ParseInt(r.URL.Query().Get("id"), 10, 64)
			if err != nil || id <= 0 {
				return "", errors.New("missing ID")
			}
			processed, err := service.TrashOrDelete(r.Context(), []int64{id})
			if err != nil {
				return "", err
			}
			if processed == 0 {
				return "", errors.New("message not found")
			}
			return "ok", nil
		})
	})

	router.Post("/api/messages/batch-delete", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				IDs []int64 `json:"ids"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			if len(data.IDs) == 0 {
				return "ok", nil
			}
			_, err := service.TrashOrDelete(r.Context(), data.IDs)
			return "ok", err
		})
	})

	router.Post("/api/messages/restore", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				ID int64 `json:"id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			_, err := service.Restore(r.Context(), []int64{data.ID})
			return "ok", err
		})
	})

	router.Post("/api/messages/batch-restore", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				IDs []int64 `json:"ids"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			if len(data.IDs) == 0 {
				return "ok", nil
			}
			_, err := service.Restore(r.Context(), data.IDs)
			return "ok", err
		})
	})

	router.Post("/api/messages/archive", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				ID      int64 `json:"id"`
				Archive int   `json:"archive"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			_, err := service.SetArchived(r.Context(), []int64{data.ID}, data.Archive == 1)
			return "ok", err
		})
	})

	router.Post("/api/messages/batch-archive", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				IDs     []int64 `json:"ids"`
				Archive int     `json:"archive"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			if len(data.IDs) == 0 {
				return "ok", nil
			}
			_, err := service.SetArchived(r.Context(), data.IDs, data.Archive == 1)
			return "ok", err
		})
	})

	router.Post("/api/messages/batch-tags", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				IDs  []int64  `json:"ids"`
				Tags []string `json:"tags"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			if len(data.IDs) == 0 || len(data.Tags) == 0 {
				return "ok", nil
			}
			_, err := service.AddTags(r.Context(), data.IDs, data.Tags)
			return "ok", err
		})
	})

	router.Post("/api/messages/set-color", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				ID    int64  `json:"id"`
				Color string `json:"color"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			return "ok", service.SetColor(r.Context(), data.ID, data.Color)
		})
	})

	router.Post("/api/messages/reorder", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				IDs []int64 `json:"ids"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			return "ok", service.ReorderNotes(r.Context(), data.IDs)
		})
	})

	router.Get("/api/tags/list", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]string, error) {
			return service.ListTags(r.Context())
		})
	})

	router.Post("/api/tags/reorder", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			var data struct {
				Names []string `json:"names"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return "", err
			}
			return "ok", service.ReorderTags(r.Context(), data.Names)
		})
	})
}

func newMultipartAttachments(headers []*multipart.FileHeader) []NewAttachment {
	attachments := make([]NewAttachment, 0, len(headers))
	for _, fileHeader := range headers {
		fileHeader := fileHeader
		attachments = append(attachments, NewAttachment{
			Filename: fileHeader.Filename,
			Open: func() (io.ReadCloser, error) {
				return fileHeader.Open()
			},
		})
	}
	return attachments
}

func parseCommaSeparatedIDs(value string) ([]int64, error) {
	if value == "" {
		return nil, nil
	}
	parts := strings.Split(value, ",")
	ids := make([]int64, 0, len(parts))
	for _, part := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id <= 0 {
			return nil, fmt.Errorf("invalid attachment ID %q", part)
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func apiCall[T any](w http.ResponseWriter, action ActionAny[T]) {
	result, err := action()
	err = writeApiResult(w, result, err)
	if err != nil {
		log.Printf("API Error: %v", err)
	}
}

func writeApiResult(w http.ResponseWriter, result any, err error) error {
	statusCode := http.StatusOK
	body := any(JsonSuccessResponse{Result: result})
	if err != nil {
		statusCode = http.StatusInternalServerError
		body = JsonFailResponse{Error: err.Error()}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(body)
}
