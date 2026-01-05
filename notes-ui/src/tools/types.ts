// --- Types for Messages ---

import {Note} from '../types';

export interface ListMessagesRequest {
  limit?: number;
  last_order?: number;
  tags?: string;
  q?: string;
  archived?: '1' | '0';
}

export type ListMessagesResponse = Note[];

export type SendMessageRequest = FormData; // Ожидает content и attachments
export type SendMessageResponse = 'ok';

export type UpdateMessageRequest = FormData; // Ожидает id, content, delete_attachments и attachments
export type UpdateMessageResponse = 'ok';

export interface DeleteMessageRequest {
  id: number;
}
export type DeleteMessageResponse = 'ok';

export interface BatchDeleteRequest {
  ids: number[];
}
export type BatchDeleteResponse = 'ok';

export interface ArchiveMessageRequest {
  id: number;
  archive: number; // 0 или 1
}
export type ArchiveMessageResponse = 'ok';

export interface ReorderMessagesRequest {
  ids: number[];
}
export type ReorderMessagesResponse = 'ok';

// --- Types for Tags ---

export type ListTagsResponse = string[];

// --- API Infrastructure ---
