package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"goNotes/assets"
	"goNotes/internal"
	"goNotes/internal/cfg"
	"goNotes/internal/utils"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	_ "embed"

	"github.com/NYTimes/gziphandler"
	_ "modernc.org/sqlite"
)

var DEBUG_UI = os.Getenv("DEBUG_UI") == "1"

//go:embed db.sql
var schemaSQL string

var db *sql.DB

func main() {
	var err error

	var config = cfg.LoadConfig()

	db, err = sql.Open("sqlite", filepath.Join(cfg.GetProfilePath(), "notes.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)"))
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Query("ALTER TABLE messages ADD COLUMN sort_order INTEGER DEFAULT 0; UPDATE messages SET sort_order = id WHERE sort_order = 0;")
	if err != nil {
		log.Printf("Migrate query error: %v", err)
	}

	_, err = db.Query("ALTER TABLE messages ADD COLUMN content_lower TEXT; UPDATE messages SET content_lower = LOWER(content) WHERE content_lower IS NULL; DROP INDEX IF EXISTS idx_messages_content_lower;")
	if err != nil {
		log.Printf("Migrate query error: %v", err)
	}

	if _, err := db.Exec(schemaSQL); err != nil {
		log.Fatalf("Init DB error: %v", err)
	}

	os.Mkdir(filepath.Join(cfg.GetProfilePath(), "uploads"), 0755)

	router := internal.NewRouter()

	internal.HandleApi(router, db, &config)

	router.Get("^/files/", handleGetFile)

	handleWww(router, &config)

	address := config.GetAddress()

	log.Printf("Listening on %s...", address)
	httpServer := &http.Server{
		Addr:    address,
		Handler: router,
	}

	err = httpServer.ListenAndServe()
	if err != nil {
		log.Println("Server error", err)
	}
}

func handleGetFile(w http.ResponseWriter, r *http.Request) {

	fileName := filepath.Base(r.URL.Path)
	fullPath := filepath.Join(cfg.GetProfilePath(), "uploads", fileName)

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, fullPath)
}

func handleWww(router *internal.Router, config *cfg.Config) {
	binTime := time.Now()
	if binPath, err := os.Executable(); err == nil {
		if binStat, err := os.Stat(binPath); err == nil {
			binTime = binStat.ModTime()
		}
	}

	type RootStore struct {
		Name string `json:"name"`
	}

	gzipHandler := gziphandler.GzipHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mTime := binTime
		assetPath := r.URL.Path

		if assetPath == "/" {
			assetPath = "/index.html"
		}

		var err error
		var content []byte
		if DEBUG_UI {
			path := "./notes-ui/dist" + assetPath
			content, err = os.ReadFile(path)
			if info, err := os.Stat(path); err == nil {
				mTime = info.ModTime()
			}
		} else {
			content, err = assets.Asset("www" + assetPath)
		}
		if err != nil {
			w.WriteHeader(404)
			return
		}

		if assetPath == "/index.html" {
			mTime = time.Now()

			store := RootStore{
				Name: config.Name,
			}

			storeJson, err := json.Marshal(store)

			body := string(content)
			body = strings.Replace(body, "{{TITLE}}", utils.EscapeHtmlInJson(config.Name), 1)
			if err == nil {
				body = strings.Replace(body, "<script id=\"root_store\"></script>", "<script id=\"root_store\">window.ROOT_STORE="+utils.EscapeHtmlInJson(string(storeJson))+"</script>", 1)
			}
			content = []byte(body)
		}

		reader := bytes.NewReader(content)
		name := path.Base(assetPath)
		http.ServeContent(w, r, name, mTime, reader)
	}))

	router.Custom([]string{http.MethodGet, http.MethodHead}, []string{"^/"}, gzipHandler.ServeHTTP)
}
