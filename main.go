package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"goNotes/assets"
	"goNotes/internal"
	"goNotes/internal/cfg"
	"goNotes/internal/utils"
	"image"
	"image/jpeg"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "embed"

	"github.com/NYTimes/gziphandler"
	"github.com/nfnt/resize"
	_ "modernc.org/sqlite"
)

var DEBUG_UI = os.Getenv("DEBUG_UI") == "1"

type Message struct {
	ID          int64     `json:"id"`
	ParentID    *int64    `json:"parent_id,omitempty"`
	Content     string    `json:"content"`
	Type        string    `json:"type"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
	Tags        []string  `json:"tags,omitempty"`
	Attachments []Message `json:"attachments,omitempty"`
}

//go:embed db.sql
var schemaSQL string

var db *sql.DB

func main() {
	var err error
	// Открываем БД с включенным режимом WAL для стабильности
	db, err = sql.Open("sqlite", "notes.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		log.Fatal(err)
	}

	// Инициализируем схему прямо из встроенной переменной
	if _, err := db.Exec(schemaSQL); err != nil {
		log.Fatalf("Init DB error: %v", err)
	}

	/*_, err = db.Query("ALTER TABLE attachments ADD COLUMN thumbnail_path TEXT DEFAULT '';")
	if err != nil {
		log.Printf("Query error: %v", err)
	}*/

	/*_, err = db.Query("UPDATE messages SET updated_at = created_at WHERE updated_at IS NULL;")
	if err != nil {
		log.Printf("Query error: %v", err)
	}*/

	// Создаем папку для вложений
	os.Mkdir("uploads", 0755)

	var config = cfg.LoadConfig()

	router := internal.NewRouter()

	router.All("/messages/send", handleSendMessage)
	router.All("/messages/list", handleListMessages)
	router.All("/messages/delete", handleDeleteMessage)
	router.All("/messages/update", handleUpdateMessage)
	router.All("/messages/batch-delete", handleBatchDeleteMessages)
	router.All("/tags/list", handleListTags)
	router.All("/share", handleSendMessage)
	router.All("^/files/", handleGetFile)
	handleWww(router, &config)

	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}

func handleGetFile(w http.ResponseWriter, r *http.Request) {
	// Извлекаем имя файла из URL (например, /files/123_test.jpg -> 123_test.jpg)
	fileName := filepath.Base(r.URL.Path)
	fullPath := filepath.Join("uploads", fileName)

	// Проверяем, существует ли файл
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Отдаем файл. Go сам определит Content-Type (image/jpeg, и т.д.)
	http.ServeFile(w, r, fullPath)
}

func handleListTags(w http.ResponseWriter, r *http.Request) {
	// Выбираем только те теги, которые привязаны хотя бы к одному сообщению
	rows, err := db.Query(`
		SELECT DISTINCT t.name 
		FROM tags t 
		JOIN message_tags mt ON t.id = mt.tag_id 
		ORDER BY t.name ASC`)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	tags := []string{}
	for rows.Next() {
		var name string
		rows.Scan(&name)
		tags = append(tags, name)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}

// --- Обработчики API ---

func handleSendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Лимит 32МБ на запрос
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	content := r.FormValue("content")

	// --- ТРАНЗАКЦИЯ ---
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. Создаем само сообщение
	res, err := tx.Exec("INSERT INTO messages (content) VALUES (?)", content)
	if err != nil {
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}
	msgID, _ := res.LastInsertId()

	// 2. Парсим и сохраняем теги
	tags := extractHashtags(content)
	for _, t := range tags {
		tx.Exec("INSERT OR IGNORE INTO tags (name) VALUES (?)", t)
		tx.Exec("INSERT INTO message_tags (message_id, tag_id) SELECT ?, id FROM tags WHERE name = ?", msgID, t)
	}

	// 3. Сохраняем вложения
	files := r.MultipartForm.File["attachments"]
	for _, fHeader := range files {
		fileName := fmt.Sprintf("%d_%s", msgID, fHeader.Filename)
		fullPath := filepath.Join("uploads", fileName)

		if err := saveFile(fHeader, fullPath); err != nil {
			log.Printf("File save error: %v", err)
			continue
		}

		// Определяем тип файла по расширению
		ext := strings.ToLower(filepath.Ext(fileName))
		fileType := "document" // по умолчанию
		thumbnailPath := ""
		if isImage(fileName) {
			fileType = "image"
			thumbName := "thumb_" + fileName
			fullThumbPath := filepath.Join("uploads", thumbName)

			// Генерируем миниатюру
			if err := generateThumbnail(fullPath, fullThumbPath); err != nil {
				log.Printf("Ошибка генерации миниатюры: %v", err)
			} else {
				thumbnailPath = thumbName // Сохраняем имя миниатюры в БД
			}
		} else if isAudio(fileName) {
			fileType = "audio"
		} else if ext == ".mp4" || ext == ".mov" {
			fileType = "video"
		}

		// Сохраняем в БД
		_, err = tx.Exec("INSERT INTO attachments (message_id, file_path, thumbnail_path, file_type) VALUES (?, ?, ?, ?)",
			msgID, fileName, thumbnailPath, fileType) // Сохраняем только имя файла, а не весь путь
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Commit error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Created message %d with %d attachments", msgID, len(files))
}

func handleDeleteMessage(w http.ResponseWriter, r *http.Request) {
	// Разрешаем только метод DELETE (или GET, если хочешь оставить упрощенно)
	if r.Method != http.MethodDelete && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing ID", http.StatusBadRequest)
		return
	}

	// 1. Получаем список всех вложений для этого сообщения перед удалением
	rows, err := db.Query("SELECT file_path, thumbnail_path FROM attachments WHERE message_id = ?", id)
	if err != nil {
		log.Printf("Error fetching attachments: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var filePath, thumbPath string
			if err := rows.Scan(&filePath, &thumbPath); err == nil {
				// Удаляем оригинал
				deletePhysicalFile(filePath)
				// Удаляем миниатюру (если есть)
				if thumbPath != "" {
					deletePhysicalFile(thumbPath)
				}
			}
		}
	}

	// Выполняем удаление. Благодаря FOREIGN KEY ON DELETE CASCADE в db.sql,
	// все вложения и теги удалятся автоматически.
	result, err := db.Exec("DELETE FROM messages WHERE id = ?", id)
	if err != nil {
		log.Printf("Error deleting message %s: %v", id, err)
		http.Error(w, "Delete failed", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Deleted")
}

func handleBatchDeleteMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(data.IDs) == 0 {
		w.WriteHeader(http.StatusOK)
		return
	}

	for _, id := range data.IDs {
		// 1. Получаем список всех вложений для этого сообщения перед удалением
		rows, err := db.Query("SELECT file_path, thumbnail_path FROM attachments WHERE message_id = ?", id)
		if err != nil {
			log.Printf("Error fetching attachments: %v", err)
		} else {
			defer rows.Close()
			for rows.Next() {
				var filePath, thumbPath string
				if err := rows.Scan(&filePath, &thumbPath); err == nil {
					// Удаляем оригинал
					deletePhysicalFile(filePath)
					// Удаляем миниатюру (если есть)
					if thumbPath != "" {
						deletePhysicalFile(thumbPath)
					}
				}
			}
		}
	}

	// SQLite эффективно удаляет через WHERE id IN (...)
	query := fmt.Sprintf("DELETE FROM messages WHERE id IN (%s)", generatePlaceholders(len(data.IDs)))

	args := make([]interface{}, len(data.IDs))
	for i, id := range data.IDs {
		args[i] = id
	}

	_, err := db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Delete failed", 500)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// --- Вспомогательные функции ---

// --- Хелперы ---

// saveFile открывает загруженный файл из формы и сохраняет его по указанному пути на сервере
func saveFile(fileHeader *multipart.FileHeader, destPath string) error {
	// 1. Открываем исходный файл из multipart формы
	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// 2. Создаем целевой файл на диске
	dst, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	// 3. Копируем содержимое из временного хранилища (память или temp-файл) в наш файл
	_, err = io.Copy(dst, src)
	if err != nil {
		return err
	}

	return nil
}

func extractHashtags(text string) []string {
	re := regexp.MustCompile(`#(\w+)`)
	matches := re.FindAllStringSubmatch(text, -1)
	set := make(map[string]struct{})
	var result []string
	for _, m := range matches {
		t := strings.ToLower(m[1])
		if _, ok := set[t]; !ok {
			set[t] = struct{}{}
			result = append(result, t)
		}
	}
	return result
}

type MessageDTO struct {
	ID          int64           `json:"id"`
	Content     string          `json:"content"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
	Tags        []string        `json:"tags"`
	Attachments []AttachmentDTO `json:"attachments"`
}

type AttachmentDTO struct {
	ID            int64  `json:"id"`
	FilePath      string `json:"file_path"`
	FileType      string `json:"file_type"`
	ThumbnailPath string `json:"thumbnail_path"`
}

func handleListMessages(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	lastID, _ := strconv.Atoi(r.URL.Query().Get("last_id"))
	tagsParam := r.URL.Query().Get("tags")
	searchQuery := r.URL.Query().Get("q") // Новый параметр поиска

	if limit <= 0 {
		limit = 15
	}

	var clauses []string
	var args []interface{}

	if lastID > 0 {
		clauses = append(clauses, "id < ?")
		args = append(args, lastID)
	}

	// Поиск по тексту (поддержка LIKE паттернов)
	if searchQuery != "" {
		// 1. Убираем лишние пробелы и разбиваем строку на слова
		searchQuery = strings.TrimSpace(searchQuery)
		words := strings.Fields(searchQuery) // Разбивает по любым пробельным символам

		for _, word := range words {
			// Заменяем '*' на '%' для поддержки ручных паттернов
			processedWord := strings.ReplaceAll(word, "*", "%")

			// Если в слове нет '*', ищем как подстроку (оборачиваем в %)
			if !strings.Contains(word, "*") {
				processedWord = "%" + word + "%"
			}

			clauses = append(clauses, "content LIKE ?")
			args = append(args, processedWord)
		}
	}

	if tagsParam != "" {
		tagList := strings.Split(tagsParam, ",")
		clauses = append(clauses, fmt.Sprintf(`id IN (
			SELECT message_id FROM message_tags mt 
			JOIN tags t ON mt.tag_id = t.id 
			WHERE t.name IN (%s)
			GROUP BY message_id
			HAVING COUNT(DISTINCT t.name) = ?
		)`, generatePlaceholders(len(tagList))))

		for _, t := range tagList {
			args = append(args, strings.ToLower(strings.TrimSpace(t)))
		}
		args = append(args, len(tagList))
	}

	whereSQL := ""
	if len(clauses) > 0 {
		whereSQL = "WHERE " + strings.Join(clauses, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT id, content, created_at, updated_at FROM (
			SELECT id, content, created_at, updated_at
			FROM messages 
			%s 
			ORDER BY id DESC 
			LIMIT ?
		) AS subquery ORDER BY id ASC`, whereSQL)

	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Query error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := make([]MessageDTO, 0)
	var messageIDs []int64

	for rows.Next() {
		var m MessageDTO
		// Если проблема с NULL решена в БД, Scan пройдет без ошибок
		if err := rows.Scan(&m.ID, &m.Content, &m.CreatedAt, &m.UpdatedAt); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}
		m.Tags = []string{}
		m.Attachments = []AttachmentDTO{}
		messages = append(messages, m)
		messageIDs = append(messageIDs, m.ID)
	}

	// 4. Batch Loading (Теги и Вложения)
	if len(messages) > 0 {
		tagsMap := fetchTagsForMessages(messageIDs)
		attachMap := fetchAttachmentsForMessages(messageIDs)
		for i := range messages {
			if t, ok := tagsMap[messages[i].ID]; ok {
				messages[i].Tags = t
			}
			if a, ok := attachMap[messages[i].ID]; ok {
				messages[i].Attachments = a
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// Вспомогательная функция для сборки тегов пачкой
func fetchTagsForMessages(ids []int64) map[int64][]string {
	res := make(map[int64][]string)
	// SQLite поддерживает раскрытие аргументов через "WHERE id IN (...)"
	query := fmt.Sprintf(`
		SELECT mt.message_id, t.name 
		FROM message_tags mt 
		JOIN tags t ON mt.tag_id = t.id 
		WHERE mt.message_id IN (%s)`, joinIDs(ids))

	rows, _ := db.Query(query)
	defer rows.Close()
	for rows.Next() {
		var mID int64
		var name string
		rows.Scan(&mID, &name)
		res[mID] = append(res[mID], name)
	}
	return res
}

// Вспомогательная функция для сборки вложений пачкой
func fetchAttachmentsForMessages(ids []int64) map[int64][]AttachmentDTO {
	res := make(map[int64][]AttachmentDTO)
	query := fmt.Sprintf(`
		SELECT message_id, id, file_path, thumbnail_path, file_type 
		FROM attachments 
		WHERE message_id IN (%s)`, joinIDs(ids))

	rows, _ := db.Query(query)
	defer rows.Close()
	for rows.Next() {
		var mID int64
		var a AttachmentDTO
		rows.Scan(&mID, &a.ID, &a.FilePath, &a.ThumbnailPath, &a.FileType)
		res[mID] = append(res[mID], a)
	}
	return res
}

func joinIDs(ids []int64) string {
	s := make([]string, len(ids))
	for i, v := range ids {
		s[i] = strconv.FormatInt(v, 10)
	}
	return strings.Join(s, ",")
}

func handleUpdateMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		ID      int64  `json:"id"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, _ := db.Begin()
	defer tx.Rollback()

	// 1. Обновляем текст и дату
	_, err := tx.Exec("UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		data.Content, data.ID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	// 2. Перепарсиваем теги (удаляем старые, ставим новые)
	tx.Exec("DELETE FROM message_tags WHERE message_id = ?", data.ID)
	tags := extractHashtags(data.Content)
	for _, t := range tags {
		tx.Exec("INSERT OR IGNORE INTO tags (name) VALUES (?)", t)
		tx.Exec("INSERT INTO message_tags (message_id, tag_id) SELECT ?, id FROM tags WHERE name = ?", data.ID, t)
	}

	tx.Commit()
	w.WriteHeader(http.StatusOK)
}

// Функция создания миниатюры (150px в ширину)
func generateThumbnail(originalPath string, thumbPath string) error {
	file, err := os.Open(originalPath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Декодируем изображение
	img, _, err := image.Decode(file)
	if err != nil {
		return err
	}

	// Изменяем размер: 150px по ширине, 0 = автоматическая высота
	m := resize.Resize(640, 0, img, resize.Bilinear)

	// Создаем файл для миниатюры
	out, err := os.Create(thumbPath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Сохраняем в формате JPEG с качеством 90
	return jpeg.Encode(out, m, &jpeg.Options{Quality: 90})
}

func isImage(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
}

// Вспомогательная функция для генерации плейсхолдеров ?, ?, ?
func generatePlaceholders(n int) string {
	p := make([]string, n)
	for i := range p {
		p[i] = "?"
	}
	return strings.Join(p, ",")
}

// Вспомогательная функция для безопасного удаления файла с диска
func deletePhysicalFile(fileName string) {
	fullPath := filepath.Join("uploads", fileName)
	if err := os.Remove(fullPath); err != nil {
		// Если файла нет — не страшно, просто логируем
		log.Printf("Could not delete file %s: %v", fullPath, err)
	} else {
		log.Printf("File deleted: %s", fullPath)
	}
}

func isAudio(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	return ext == ".mp3" || ext == ".wav" || ext == ".ogg" || ext == ".m4a" || ext == ".aac"
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

		log.Println("assetPath", assetPath)

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
			body = strings.Replace(body, "{{TITLE}}", "goNotes", 1)
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
