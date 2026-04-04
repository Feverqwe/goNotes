package internal

type MessageDTO struct {
	ID          int64           `json:"id"`
	SortOrder   int             `json:"sort_order"`
	Content     string          `json:"content"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
	UsedAt      string          `json:"used_at"`
	IsArchived  int             `json:"is_archived"`
	Tags        []string        `json:"tags"`
	Attachments []AttachmentDTO `json:"attachments"`
	Color       string          `json:"color"`
}

type AttachmentDTO struct {
	ID            int64  `json:"id"`
	FilePath      string `json:"file_path"`
	FileType      string `json:"file_type"`
	ThumbnailPath string `json:"thumbnail_path"`
}
