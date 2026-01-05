package internal

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"goNotes/internal/cfg"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/NYTimes/gziphandler"
)

type ActionAny[T any] func() (T, error)

type JsonFailResponse struct {
	Error string `json:"error"`
}

type JsonSuccessResponse struct {
	Result interface{} `json:"result"`
}

var db *sql.DB

func HandleApi(router *Router, database *sql.DB, config *cfg.Config) {
	db = database
	apiRouter := NewRouter()

	// Применяем Gzip ко всем ответам API
	gzipHandler := gziphandler.GzipHandler(apiRouter)

	handleAction(apiRouter, config)

	// Регистрируем API роутер в основном роутере с префиксом
	router.All("^/api/", gzipHandler.ServeHTTP)
}

func handleAction(router *Router, config *cfg.Config) {
	// Список сообщений (GET /api/messages/list)
	router.Get("/api/messages/list", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (interface{}, error) {
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			lastOrder, _ := strconv.Atoi(r.URL.Query().Get("last_order"))
			tagsParam := r.URL.Query().Get("tags")
			searchQuery := r.URL.Query().Get("q")
			onlyArchived := r.URL.Query().Get("archived") == "1"

			if limit <= 0 {
				limit = 15
			}

			var clauses []string
			var args []interface{}

			if lastOrder > 0 {
				clauses = append(clauses, "sort_order < ?")
				args = append(args, lastOrder)
			}

			// Поиск по тексту (учитываем регистр для кириллицы)
			if searchQuery != "" {
				searchQuery = strings.TrimSpace(searchQuery)
				words := strings.Fields(searchQuery)

				for _, word := range words {
					// Приводим поисковое слово к нижнему регистру в Go
					processedWord := strings.ToLower(strings.ReplaceAll(word, "*", "%"))

					if !strings.Contains(word, "*") {
						processedWord = "%" + processedWord + "%"
					}

					// Используем LOWER(content) для сравнения без учета регистра
					clauses = append(clauses, "LOWER(content) LIKE ?")
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

			if searchQuery != "" || tagsParam != "" {
				// Если есть поиск или теги — показываем всё (и архив, и обычные)
			} else if onlyArchived {
				// Если выбран режим "Архив" — показываем ТОЛЬКО архивные
				clauses = append(clauses, "is_archived = 1")
			} else {
				// Обычный режим — показываем только НЕ архивные
				clauses = append(clauses, "is_archived = 0")
			}

			whereSQL := ""
			if len(clauses) > 0 {
				whereSQL = "WHERE " + strings.Join(clauses, " AND ")
			}

			query := fmt.Sprintf(`
				SELECT id, content, created_at, updated_at, is_archived, sort_order
					FROM messages 
					%s 
					ORDER BY sort_order DESC
					LIMIT ?`, whereSQL)

			args = append(args, limit)

			rows, err := db.Query(query, args...)
			if err != nil {
				log.Printf("Query error: %v", err)
				return nil, err
			}
			defer rows.Close()

			messages := make([]MessageDTO, 0)
			var messageIDs []int64

			for rows.Next() {
				var m MessageDTO
				// Если проблема с NULL решена в БД, Scan пройдет без ошибок
				if err := rows.Scan(&m.ID, &m.Content, &m.CreatedAt, &m.UpdatedAt, &m.IsArchived, &m.SortOrder); err != nil {
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
			return messages, nil
		})
	})

	// Создание сообщения (POST /api/messages/send)
	router.Post("/api/messages/send", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (interface{}, error) {
			// Лимит 32МБ на запрос
			if err := r.ParseMultipartForm(32 << 20); err != nil {
				return nil, err
			}

			content := r.FormValue("content")

			// --- ТРАНЗАКЦИЯ ---
			tx, err := db.Begin()
			if err != nil {
				return nil, err
			}
			defer tx.Rollback()

			var maxOrder int
			db.QueryRow("SELECT COALESCE(MAX(sort_order), 0) FROM messages").Scan(&maxOrder)

			// 1. Создаем само сообщение
			res, err := tx.Exec("INSERT INTO messages (content, sort_order) VALUES (?, ?)", content, maxOrder+1)
			if err != nil {
				return nil, err
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
				fullPath := filepath.Join(cfg.GetProfilePath(), "uploads", fileName)

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
					fullThumbPath := filepath.Join(cfg.GetProfilePath(), "uploads", thumbName)

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
				return nil, err
			}

			return "ok", nil // TODO: Перенести из main.go
		})
	})

	// Обновление сообщения (POST /api/messages/update)
	router.Post("/api/messages/update", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (interface{}, error) {
			// Лимит 32МБ
			if err := r.ParseMultipartForm(32 << 20); err != nil {
				return nil, err
			}

			idStr := r.FormValue("id")
			content := r.FormValue("content")
			// Список ID вложений, которые нужно УДАЛИТЬ (придет строкой через запятую)
			deleteAttachIDs := r.FormValue("delete_attachments")

			id, _ := strconv.ParseInt(idStr, 10, 64)

			tx, _ := db.Begin()
			defer tx.Rollback()

			// 1. Обновляем текст
			_, err := tx.Exec("UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", content, id)
			if err != nil {
				return nil, err
			}

			// 2. Удаляем помеченные вложения
			if deleteAttachIDs != "" {
				ids := strings.Split(deleteAttachIDs, ",")
				for _, aid := range ids {
					// Сначала удаляем физически
					var filePath, thumbPath string
					err := tx.QueryRow("SELECT file_path, thumbnail_path FROM attachments WHERE id = ? AND message_id = ?", aid, id).Scan(&filePath, &thumbPath)
					if err == nil {
						deletePhysicalFile(filePath)
						if thumbPath != "" {
							deletePhysicalFile(thumbPath)
						}
					}
					// Затем из базы
					tx.Exec("DELETE FROM attachments WHERE id = ?", aid)
				}
			}

			// 3. Добавляем новые вложения (та же логика, что в handleSendMessage)
			files := r.MultipartForm.File["attachments"]
			for _, fHeader := range files {
				fileName := fmt.Sprintf("%d_%s", id, fHeader.Filename)
				fullPath := filepath.Join(cfg.GetProfilePath(), "uploads", fileName)
				if err := saveFile(fHeader, fullPath); err == nil {
					fileType := "document"
					thumbnailPath := ""
					if isImage(fileName) {
						fileType = "image"
						thumbName := "thumb_" + fileName
						if err := generateThumbnail(fullPath, filepath.Join(cfg.GetProfilePath(), "uploads", thumbName)); err == nil {
							thumbnailPath = thumbName
						}
					}
					tx.Exec("INSERT INTO attachments (message_id, file_path, thumbnail_path, file_type) VALUES (?, ?, ?, ?)",
						id, fileName, thumbnailPath, fileType)
				}
			}

			// 4. Обновляем теги
			tx.Exec("DELETE FROM message_tags WHERE message_id = ?", id)
			tags := extractHashtags(content)
			for _, t := range tags {
				tx.Exec("INSERT OR IGNORE INTO tags (name) VALUES (?)", t)
				tx.Exec("INSERT INTO message_tags (message_id, tag_id) SELECT ?, id FROM tags WHERE name = ?", id, t)
			}

			if err := tx.Commit(); err != nil {
				return nil, err
			}

			return "ok", nil // TODO: Перенести из main.go
		})
	})

	// Сообщения: Удаление
	router.Delete("/api/messages/delete", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			id := r.URL.Query().Get("id")

			if id == "" {
				err := errors.New("Missing ID")
				return "", err
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
				return "", err
			}

			rowsAffected, _ := result.RowsAffected()
			if rowsAffected == 0 {
				return "", errors.New("Message not found")
			}

			return "ok", nil
		})
	})

	// Массовое удаление (POST /api/messages/batch-delete)
	router.Post("/api/messages/batch-delete", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (interface{}, error) {
			var data struct {
				IDs []int64 `json:"ids"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				return nil, err
			}

			if len(data.IDs) == 0 {
				w.WriteHeader(http.StatusOK)
				return "ok", nil
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
				return nil, err
			}

			return "ok", nil
		})
	})

	// Архивация (POST /api/messages/archive)
	router.Post("/api/messages/archive", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (interface{}, error) {
			var data struct {
				Id      int64 `json:"id"`
				Archive int   `json:"archive"`
			}
			json.NewDecoder(r.Body).Decode(&data)
			id := data.Id
			archive := data.Archive

			_, err := db.Exec("UPDATE messages SET is_archived = ? WHERE id = ?", archive, id)
			if err != nil {
				return nil, err
			}
			return "ok", nil
		})
	})

	// Изменение порядка (POST /api/messages/reorder)
	router.Post("/api/messages/reorder", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (interface{}, error) {
			var data struct {
				IDs []int64 `json:"ids"`
			}
			json.NewDecoder(r.Body).Decode(&data)

			tx, err := db.Begin()
			if err != nil {
				return nil, err
			}
			defer tx.Rollback()

			// 1. Получаем текущие значения sort_order для этих ID из базы, чтобы знать границы "окна"
			rows, err := tx.Query(fmt.Sprintf("SELECT sort_order FROM messages WHERE id IN (%s) ORDER BY sort_order DESC", joinIDs(data.IDs)))
			if err != nil {
				return nil, err
			}
			var orders []int
			for rows.Next() {
				var o int
				rows.Scan(&o)
				orders = append(orders, o)
			}
			rows.Close()

			// 2. Присваиваем эти же значения, но в новом порядке
			for i, id := range data.IDs {
				tx.Exec("UPDATE messages SET sort_order = ? WHERE id = ?", orders[i], id)
			}

			if err := tx.Commit(); err != nil {
				return nil, err
			}

			return "ok", nil // TODO: Перенести из main.go
		})
	})

	// Список тегов (GET /api/tags/list)
	router.Get("/api/tags/list", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]string, error) {
			// Выбираем только те теги, которые привязаны хотя бы к одному сообщению
			rows, err := db.Query(`
				SELECT DISTINCT t.name 
				FROM tags t 
				JOIN message_tags mt ON t.id = mt.tag_id 
				ORDER BY t.name ASC`)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			tags := []string{}
			for rows.Next() {
				var name string
				rows.Scan(&name)
				tags = append(tags, name)
			}

			return tags, nil
		})
	})

}

func apiCall[T any](w http.ResponseWriter, action ActionAny[T]) {
	result, err := action()
	err = writeApiResult(w, result, err)
	if err != nil {
		log.Printf("API Error: %v", err)
	}
}

func writeApiResult(w http.ResponseWriter, result interface{}, err error) error {
	var statusCode int
	var body interface{}
	if err != nil {
		statusCode = 500
		body = JsonFailResponse{Error: err.Error()}
	} else {
		statusCode = 200
		body = JsonSuccessResponse{Result: result}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(body)
}
