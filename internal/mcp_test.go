package internal

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

func TestMCPRequiresBearerTokenAndListsTools(t *testing.T) {
	service := newTestNotesService(t)
	router := NewRouter()
	HandleMCP(router, service, "test-secret", "test")

	request := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(`{
		"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}
	}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status without token = %d, want %d", response.Code, http.StatusUnauthorized)
	}

	request = httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(`{
		"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}
	}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("Authorization", "Bearer test-secret")
	request.Header.Set("MCP-Protocol-Version", "2025-06-18")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("authorized status = %d, body = %s", response.Code, response.Body.String())
	}
	body := response.Body.String()
	for _, toolName := range []string{"notes_list", "note_create", "note_update", "attachment_get", "notes_delete_permanently"} {
		if !strings.Contains(body, `"name":"`+toolName+`"`) {
			t.Errorf("tools/list response does not contain %q: %s", toolName, body)
		}
	}
	if !strings.Contains(body, `||hidden text||`) {
		t.Errorf("tools/list response does not describe custom spoiler syntax: %s", body)
	}
}

func TestHTTPAndMCPShareNotesService(t *testing.T) {
	service := newTestNotesService(t)
	router := NewRouter()
	HandleApi(router, service)
	HandleMCP(router, service, "test-secret", "test")

	response := callAPI(t, router, multipartAPIRequest(t, "/api/messages/send", map[string]string{
		"content": "Shared transport note #shared",
	}, nil))
	created := decodeAPIResult[struct {
		ID int64 `json:"id"`
	}](t, response)

	request := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(`{
		"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
			"name":"note_get","arguments":{"id":`+strconv.FormatInt(created.ID, 10)+`}
		}
	}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("Authorization", "Bearer test-secret")
	request.Header.Set("MCP-Protocol-Version", "2025-06-18")
	response = callAPI(t, router, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "Shared transport note") {
		t.Fatalf("MCP could not read HTTP-created note: status = %d, body = %s", response.Code, response.Body.String())
	}
}
