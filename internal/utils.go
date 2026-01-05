package internal

import (
	"fmt"
	"goNotes/internal/cfg"
	"image"
	"image/jpeg"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/nfnt/resize"
	"github.com/rwcarlsen/goexif/exif"
)

func generatePlaceholders(n int) string {
	p := make([]string, n)
	for i := range p {
		p[i] = "?"
	}
	return strings.Join(p, ",")
}

func joinIDs(ids []int64) string {
	s := make([]string, len(ids))
	for i, v := range ids {
		s[i] = strconv.FormatInt(v, 10)
	}
	return strings.Join(s, ",")
}

// Вспомогательная функция для безопасного удаления файла с диска
func deletePhysicalFile(fileName string) {
	fullPath := filepath.Join(cfg.GetProfilePath(), "uploads", fileName)
	if err := os.Remove(fullPath); err != nil {
		// Если файла нет — не страшно, просто логируем
		log.Printf("Could not delete file %s: %v", fullPath, err)
	} else {
		log.Printf("File deleted: %s", fullPath)
	}
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

func extractHashtags(text string) []string {
	re := regexp.MustCompile(`#([^\s$]+)`)
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

func isImage(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
}

func isAudio(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	return ext == ".mp3" || ext == ".wav" || ext == ".ogg" || ext == ".m4a" || ext == ".aac"
}

// rotate90 поворачивает на 90 градусов по часовой стрелке
func rotate90(img image.Image) image.Image {
	bounds := img.Bounds()
	newImg := image.NewRGBA(image.Rect(0, 0, bounds.Dy(), bounds.Dx()))
	for x := bounds.Min.X; x < bounds.Max.X; x++ {
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			newImg.Set(bounds.Max.Y-y-1, x, img.At(x, y))
		}
	}
	return newImg
}

// rotate180 поворачивает на 180 градусов
func rotate180(img image.Image) image.Image {
	bounds := img.Bounds()
	newImg := image.NewRGBA(bounds)
	for x := bounds.Min.X; x < bounds.Max.X; x++ {
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			newImg.Set(bounds.Max.X-x-1, bounds.Max.Y-y-1, img.At(x, y))
		}
	}
	return newImg
}

// rotate270 поворачивает на 270 градусов (или 90 против часовой)
func rotate270(img image.Image) image.Image {
	bounds := img.Bounds()
	newImg := image.NewRGBA(image.Rect(0, 0, bounds.Dy(), bounds.Dx()))
	for x := bounds.Min.X; x < bounds.Max.X; x++ {
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			newImg.Set(y, bounds.Max.X-x-1, img.At(x, y))
		}
	}
	return newImg
}

// Вспомогательная функция для поворота (добавьте в main.go)
func applyOrientation(img image.Image, orientation string) image.Image {
	switch orientation {
	case "3": // 180°
		return rotate180(img)
	case "6": // 90° CW
		return rotate90(img)
	case "8": // 270° CW
		return rotate270(img)
	}
	return img
}

// Функция создания миниатюры (150px в ширину)
func generateThumbnail(originalPath string, thumbPath string) error {
	file, err := os.Open(originalPath)
	if err != nil {
		return err
	}
	defer file.Close()

	// 1. Читаем EXIF метаданные для определения ориентации
	var orientation = "1"
	x, err := exif.Decode(file)
	if err == nil {
		tag, err := x.Get(exif.Orientation)
		if err == nil {
			orientation = tag.String()
		}
	}

	// Сбрасываем указатель в начало файла после чтения EXIF
	file.Seek(0, 0)

	// Декодируем изображение
	img, _, err := image.Decode(file)
	if err != nil {
		return err
	}

	// 3. Применяем поворот на основе EXIF
	img = applyOrientation(img, orientation)

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
