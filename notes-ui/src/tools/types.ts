import {Note} from '../types';

export interface ListNotesRequest {
  id?: number;
  limit?: number;
  last_order?: number;
  tags?: string;
  q?: string;
  archived?: '1' | '0';
  deleted?: '1' | '0';
}

export type ListNotesResponse = Note[];

export type CreateNoteRequest = FormData;
export interface CreateNoteResponse {
  id: number;
}

export type UpdateNoteRequest = FormData;
export type UpdateNoteResponse = 'ok';

export interface DeleteNoteRequest {
  id: number;
}
export type DeleteNoteResponse = 'ok';

export interface BatchDeleteRequest {
  ids: number[];
}
export type BatchDeleteResponse = 'ok';

export interface RestoreNoteRequest {
  id: number;
}
export type RestoreNoteResponse = 'ok';

export interface BatchRestoreRequest {
  ids: number[];
}
export type BatchRestoreResponse = 'ok';

export interface ArchiveNoteRequest {
  id: number;
  archive: number;
}
export type ArchiveNoteResponse = 'ok';

export interface ReorderNotesRequest {
  ids: number[];
}
export type ReorderNotesResponse = 'ok';

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

export interface MarkNoteUsedRequest {
  id: number;
}
export type MarkNoteUsedResponse = 'ok';

export interface SetExpandedRequest {
  id: number;
  expanded: number;
}
export type SetExpandedResponse = 'ok';
