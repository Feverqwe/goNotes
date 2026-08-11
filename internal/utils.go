package internal

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"image"
	"image/jpeg"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
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

func extractHashtags(text string) []string {
	// 1. Удаляем многострочные блоки кода: ```любой контент```
	reCodeBlock := regexp.MustCompile("(?s)```.*?```")
	cleanText := reCodeBlock.ReplaceAllString(text, "")

	// 2. Удаляем инлайновые блоки кода: `контент`
	reInlineCode := regexp.MustCompile("`.*?`")
	cleanText = reInlineCode.ReplaceAllString(cleanText, "")

	// 3. Извлекаем хештеги из оставшегося "чистого" текста
	// Используем обновленную регулярку, которая не берет знаки пунктуации в конце
	re := regexp.MustCompile(`#([^\s$!@#%^&*()=+\[\]{}|\\;:'",.<>?/` + "`" + `]+)`)
	matches := re.FindAllStringSubmatch(cleanText, -1)

	set := make(map[string]struct{})
	var result []string
	for _, m := range matches {
		t := strings.ToLower(m[1])
		// Проверка на пустой тег или просто символ #
		if t == "" {
			continue
		}
		if _, ok := set[t]; !ok {
			set[t] = struct{}{}
			result = append(result, t)
		}
	}
	return result
}

func saveFile(fileHeader *multipart.FileHeader, destDir string) (string, error) {
	src, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	originalName := filepath.Base(strings.ReplaceAll(fileHeader.Filename, "\\", "/"))
	return saveReader(src, originalName, destDir)
}

func saveReader(src io.Reader, originalName, destDir string) (string, error) {
	originalName = filepath.Base(strings.ReplaceAll(originalName, "\\", "/"))
	if originalName == "" || originalName == "." {
		return "", errors.New("invalid attachment filename")
	}

	for range 10 {
		randomBytes := make([]byte, 16)
		if _, err := rand.Read(randomBytes); err != nil {
			return "", err
		}

		fileName := hex.EncodeToString(randomBytes) + "_" + originalName
		destPath := filepath.Join(destDir, fileName)
		dst, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
		if errors.Is(err, os.ErrExist) {
			continue
		}
		if err != nil {
			return "", err
		}

		_, copyErr := io.Copy(dst, src)
		closeErr := dst.Close()
		if copyErr != nil {
			_ = os.Remove(destPath)
			return "", copyErr
		}
		if closeErr != nil {
			_ = os.Remove(destPath)
			return "", closeErr
		}

		return fileName, nil
	}

	return "", errors.New("could not allocate a unique attachment filename")
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
