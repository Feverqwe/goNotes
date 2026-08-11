package internal

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

type testUpload struct {
	filename string
	content  string
}

func newTestAPIRouter(t *testing.T) (*Router, *NotesService) {
	t.Helper()
	service := newTestNotesService(t)
	router := NewRouter()
	HandleApi(router, service)
	return router, service
}

func multipartAPIRequest(t *testing.T, path string, fields map[string]string, uploads []testUpload) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for name, value := range fields {
		if err := writer.WriteField(name, value); err != nil {
			t.Fatal(err)
		}
	}
	for _, upload := range uploads {
		part, err := writer.CreateFormFile("attachments", upload.filename)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := io.WriteString(part, upload.content); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, path, &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}

func jsonAPIRequest(t *testing.T, method, path, body string) *http.Request {
	t.Helper()
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	return request
}

func callAPI(t *testing.T, router *Router, request *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func decodeAPIResult[T any](t *testing.T, response *httptest.ResponseRecorder) T {
	t.Helper()
	var envelope struct {
		Result T      `json:"result"`
		Error  string `json:"error"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode API response: %v; body = %s", err, response.Body.String())
	}
	if response.Code != http.StatusOK || envelope.Error != "" {
		t.Fatalf("API status = %d, error = %q, body = %s", response.Code, envelope.Error, response.Body.String())
	}
	return envelope.Result
}

func TestHTTPAPINoteLifecycleUsesNotesService(t *testing.T) {
	router, service := newTestAPIRouter(t)

	response := callAPI(t, router, multipartAPIRequest(t, "/api/messages/send", map[string]string{
		"content": "Initial #work",
	}, []testUpload{{filename: "report.txt", content: "attachment body"}}))
	created := decodeAPIResult[struct {
		ID int64 `json:"id"`
	}](t, response)
	if created.ID <= 0 {
		t.Fatalf("created ID = %d", created.ID)
	}
	note, err := service.GetNote(t.Context(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(note.Attachments) != 1 || len(note.Tags) != 1 || note.Tags[0] != "work" {
		t.Fatalf("unexpected created note: %+v", note)
	}
	attachmentPath := filepath.Join(service.UploadsDir, note.Attachments[0].FilePath)

	response = callAPI(t, router, multipartAPIRequest(t, "/api/messages/update", map[string]string{
		"id":                 strconv.FormatInt(created.ID, 10),
		"content":            "Updated #done",
		"delete_attachments": strconv.FormatInt(note.Attachments[0].ID, 10),
	}, nil))
	if result := decodeAPIResult[string](t, response); result != "ok" {
		t.Fatalf("update result = %q", result)
	}
	note, err = service.GetNote(t.Context(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if note.Content != "Updated #done" || len(note.Tags) != 1 || note.Tags[0] != "done" || len(note.Attachments) != 0 {
		t.Fatalf("unexpected updated note: %+v", note)
	}
	if _, err := os.Stat(attachmentPath); !os.IsNotExist(err) {
		t.Fatalf("removed attachment still exists or stat failed unexpectedly: %v", err)
	}

	response = callAPI(t, router, jsonAPIRequest(t, http.MethodPost, "/api/messages/archive",
		`{"id":`+strconv.FormatInt(created.ID, 10)+`,"archive":1}`))
	decodeAPIResult[string](t, response)
	response = callAPI(t, router, httptest.NewRequest(http.MethodGet, "/api/messages/list?q=updated", nil))
	searchResults := decodeAPIResult[[]MessageDTO](t, response)
	if len(searchResults) != 1 || searchResults[0].ID != created.ID || searchResults[0].IsArchived != 1 {
		t.Fatalf("global search did not return archived note: %+v", searchResults)
	}

	deletePath := "/api/messages/delete?id=" + strconv.FormatInt(created.ID, 10)
	response = callAPI(t, router, httptest.NewRequest(http.MethodDelete, deletePath, nil))
	decodeAPIResult[string](t, response)
	note, err = service.GetNote(t.Context(), created.ID)
	if err != nil || note.IsDeleted != 1 || note.IsArchived != 1 {
		t.Fatalf("first delete did not preserve archived state in trash: %+v, %v", note, err)
	}
	response = callAPI(t, router, httptest.NewRequest(http.MethodDelete, deletePath, nil))
	decodeAPIResult[string](t, response)
	if _, err := service.GetNote(t.Context(), created.ID); err == nil {
		t.Fatal("second delete did not permanently remove note")
	}
}

func TestHTTPAPITagCursorGroupsArchivedAfterActive(t *testing.T) {
	router, service := newTestAPIRouter(t)
	active, err := service.CreateNote(t.Context(), "Active #shared", nil)
	if err != nil {
		t.Fatal(err)
	}
	archived, err := service.CreateNote(t.Context(), "Archived #shared", nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.SetArchived(t.Context(), []int64{archived.ID}, true); err != nil {
		t.Fatal(err)
	}

	response := callAPI(t, router, httptest.NewRequest(http.MethodGet, "/api/messages/list?tags=shared&limit=1", nil))
	firstPage := decodeAPIResult[[]MessageDTO](t, response)
	if len(firstPage) != 1 || firstPage[0].ID != active.ID {
		t.Fatalf("first tag page = %+v, want active note %d", firstPage, active.ID)
	}
	secondURL := "/api/messages/list?tags=shared&limit=1&last_order=" + strconv.Itoa(firstPage[0].SortOrder) +
		"&last_archived=" + strconv.Itoa(firstPage[0].IsArchived)
	response = callAPI(t, router, httptest.NewRequest(http.MethodGet, secondURL, nil))
	secondPage := decodeAPIResult[[]MessageDTO](t, response)
	if len(secondPage) != 1 || secondPage[0].ID != archived.ID {
		t.Fatalf("second tag page = %+v, want archived note %d", secondPage, archived.ID)
	}
}
