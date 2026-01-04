export interface Attachment {
  thumbnail_path?: string;
  file_path: string;
  file_type: string;
  id: number;
}

export interface Note {
  id: number;
  content: string;
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
  tags?: string[];
}
