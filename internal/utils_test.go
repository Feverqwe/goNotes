package internal

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func multipartFileHeader(t *testing.T, filename, content string) *multipart.FileHeader {
	t.Helper()

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("attachments", filename)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.WriteString(part, content); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest(http.MethodPost, "/", &body)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	if err := req.ParseMultipartForm(1 << 20); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if req.MultipartForm != nil {
			_ = req.MultipartForm.RemoveAll()
		}
	})

	return req.MultipartForm.File["attachments"][0]
}

func TestSaveFileDoesNotOverwriteSameFilename(t *testing.T) {
	uploadsDir := t.TempDir()
	firstHeader := multipartFileHeader(t, "report.txt", "first")
	secondHeader := multipartFileHeader(t, "report.txt", "second")

	firstName, err := saveFile(firstHeader, uploadsDir)
	if err != nil {
		t.Fatal(err)
	}
	secondName, err := saveFile(secondHeader, uploadsDir)
	if err != nil {
		t.Fatal(err)
	}

	if firstName == secondName {
		t.Fatalf("same original filename was stored at the same path: %q", firstName)
	}
	for _, name := range []string{firstName, secondName} {
		parts := strings.SplitN(name, "_", 2)
		if len(parts) != 2 || parts[1] != "report.txt" {
			t.Errorf("stored filename %q does not preserve the original filename", name)
		}
	}

	firstContent, err := os.ReadFile(filepath.Join(uploadsDir, firstName))
	if err != nil {
		t.Fatal(err)
	}
	secondContent, err := os.ReadFile(filepath.Join(uploadsDir, secondName))
	if err != nil {
		t.Fatal(err)
	}
	if string(firstContent) != "first" || string(secondContent) != "second" {
		t.Fatalf("stored contents = %q and %q, want %q and %q", firstContent, secondContent, "first", "second")
	}
}

func TestSaveFileUsesBaseFilename(t *testing.T) {
	header := multipartFileHeader(t, `C:\\fakepath\\photo.jpg`, "image")

	name, err := saveFile(header, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(name, "_photo.jpg") {
		t.Fatalf("stored filename = %q, want it to end with _photo.jpg", name)
	}
}
