import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';

import {API_BASE} from '../constants';

import {
  ArchiveNoteRequest,
  ArchiveNoteResponse,
  BatchArchiveRequest,
  BatchArchiveResponse,
  BatchDeleteRequest,
  BatchDeleteResponse,
  BatchRestoreRequest,
  BatchRestoreResponse,
  BatchTagsRequest,
  BatchTagsResponse,
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  DeleteNoteResponse,
  ListNotesRequest,
  ListNotesResponse,
  ListTagsResponse,
  MarkNoteUsedRequest,
  MarkNoteUsedResponse,
  ReorderNotesRequest,
  ReorderNotesResponse,
  ReorderTagsRequest,
  ReorderTagsResponse,
  RestoreNoteRequest,
  RestoreNoteResponse,
  SetColorRequest,
  SetColorResponse,
  SetExpandedRequest,
  SetExpandedResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
} from './types';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function handleResponse<T>(
  response: AxiosResponse<{result?: T; error?: string}>,
): Promise<T> {
  const body = response.data;
  if (body && body.error) {
    throw new Error(body.error);
  }
  if (!body || body.result === undefined) {
    throw new Error('Response does not contain a result');
  }
  return body.result;
}

interface ActionParams {
  method?: 'GET' | 'POST' | 'DELETE';
  path: string;
}

function action<RequestParams = unknown, ResponseData = unknown>({
  method = 'GET',
  path,
}: ActionParams) {
  return async (params: RequestParams, options?: AxiosRequestConfig): Promise<ResponseData> => {
    const config: AxiosRequestConfig = {
      ...options,
      method,
      url: path,
    };

    if (method === 'GET' || method === 'DELETE') {
      config.params = params;
    } else {
      config.data = params;
      if (params instanceof FormData) {
        config.headers = {
          ...config.headers,
          'Content-Type': undefined,
        };
      }
    }

    return client.request<{result: ResponseData; error?: string}>(config).then(handleResponse);
  };
}

export const api = {
  notes: {
    list: action<ListNotesRequest, ListNotesResponse>({
      path: '/api/messages/list',
    }),
    create: action<CreateNoteRequest, CreateNoteResponse>({
      method: 'POST',
      path: '/api/messages/send',
    }),
    update: action<UpdateNoteRequest, UpdateNoteResponse>({
      method: 'POST',
      path: '/api/messages/update',
    }),
    markUsed: action<MarkNoteUsedRequest, MarkNoteUsedResponse>({
      method: 'POST',
      path: '/api/messages/use',
    }),
    setExpanded: action<SetExpandedRequest, SetExpandedResponse>({
      method: 'POST',
      path: '/api/messages/set-expanded',
    }),
    delete: action<DeleteNoteRequest, DeleteNoteResponse>({
      method: 'DELETE',
      path: '/api/messages/delete',
    }),
    batchDelete: action<BatchDeleteRequest, BatchDeleteResponse>({
      method: 'POST',
      path: '/api/messages/batch-delete',
    }),
    restore: action<RestoreNoteRequest, RestoreNoteResponse>({
      method: 'POST',
      path: '/api/messages/restore',
    }),
    batchRestore: action<BatchRestoreRequest, BatchRestoreResponse>({
      method: 'POST',
      path: '/api/messages/batch-restore',
    }),
    archive: action<ArchiveNoteRequest, ArchiveNoteResponse>({
      method: 'POST',
      path: '/api/messages/archive',
    }),
    setColor: action<SetColorRequest, SetColorResponse>({
      method: 'POST',
      path: '/api/messages/set-color',
    }),
    batchArchive: action<BatchArchiveRequest, BatchArchiveResponse>({
      method: 'POST',
      path: '/api/messages/batch-archive',
    }),
    batchTags: action<BatchTagsRequest, BatchTagsResponse>({
      method: 'POST',
      path: '/api/messages/batch-tags',
    }),
    reorder: action<ReorderNotesRequest, ReorderNotesResponse>({
      method: 'POST',
      path: '/api/messages/reorder',
    }),
  },
  tags: {
    list: action<void, ListTagsResponse>({
      path: '/api/tags/list',
    }),
    reorder: action<ReorderTagsRequest, ReorderTagsResponse>({
      method: 'POST',
      path: '/api/tags/reorder',
    }),
  },
};
