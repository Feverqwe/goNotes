import {Note} from '../types';

export interface ListMessagesRequest {
  id?: number;
  limit?: number;
  last_order?: number;
  tags?: string;
  q?: string;
  archived?: '1' | '0';
  deleted?: '1' | '0';
}

export type ListMessagesResponse = Note[];

export type SendMessageRequest = FormData;
export interface SendMessageResponse {
  id: number;
}

export type UpdateMessageRequest = FormData;
export type UpdateMessageResponse = 'ok';

export interface DeleteMessageRequest {
  id: number;
}
export type DeleteMessageResponse = 'ok';

export interface BatchDeleteRequest {
  ids: number[];
}
export type BatchDeleteResponse = 'ok';

export interface RestoreMessageRequest {
  id: number;
}
export type RestoreMessageResponse = 'ok';

export interface BatchRestoreRequest {
  ids: number[];
}
export type BatchRestoreResponse = 'ok';

export interface ArchiveMessageRequest {
  id: number;
  archive: number;
}
export type ArchiveMessageResponse = 'ok';

export interface ReorderMessagesRequest {
  ids: number[];
}
export type ReorderMessagesResponse = 'ok';

export type ListTagsResponse = string[];

export interface ReorderTagsRequest {
  names: string[];
}
export type ReorderTagsResponse = 'ok';

export interface BatchArchiveRequest {
  ids: number[];
  archive: number;
}
export type BatchArchiveResponse = 'ok';

export interface BatchTagsRequest {
  ids: number[];
  tags: string[];
}
export type BatchTagsResponse = 'ok';

export interface SetColorRequest {
  id: number;
  color: string;
}
export type SetColorResponse = 'ok';

export interface UseMessageRequest {
  id: number;
}
export type UseMessageResponse = 'ok';

export interface SetExpandedRequest {
  id: number;
  expanded: number;
}
export type SetExpandedResponse = 'ok';
