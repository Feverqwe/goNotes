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

func deletePhysicalFile(fileName string) {
	fullPath := filepath.Join(cfg.GetProfilePath(), "uploads", fileName)
	if err := os.Remove(fullPath); err != nil {

		log.Printf("Could not delete file %s: %v", fullPath, err)
	} else {
		log.Printf("File deleted: %s", fullPath)
	}
}

func fetchTagsForMessages(ids []int64) map[int64][]string {
	res := make(map[int64][]string)

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
	re := regexp.MustCompile(`#([^\s$` + "`" + `]+)`)
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

func saveFile(fileHeader *multipart.FileHeader, destPath string) error {

	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer dst.Close()

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

func isVideo(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	return ext == ".mp4" || ext == ".mov"
}

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

func generateThumbnail(originalPath string, thumbPath string) error {
	file, err := os.Open(originalPath)
	if err != nil {
		return err
	}
	defer file.Close()

	var orientation = "1"
	x, err := exif.Decode(file)
	if err == nil {
		tag, err := x.Get(exif.Orientation)
		if err == nil {
			orientation = tag.String()
		}
	}

	file.Seek(0, 0)

	img, _, err := image.Decode(file)
	if err != nil {
		return err
	}

	img = applyOrientation(img, orientation)

	m := resize.Resize(640, 0, img, resize.Bilinear)

	out, err := os.Create(thumbPath)
	if err != nil {
		return err
	}
	defer out.Close()

	return jpeg.Encode(out, m, &jpeg.Options{Quality: 90})
}
