import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {API_BASE} from '../constants';
import {
  ArchiveMessageRequest,
  ArchiveMessageResponse,
  BatchArchiveRequest,
  BatchArchiveResponse,
  BatchDeleteRequest,
  BatchDeleteResponse,
  BatchRestoreRequest,
  BatchRestoreResponse,
  DeleteMessageRequest,
  DeleteMessageResponse,
  ListMessagesRequest,
  ListMessagesResponse,
  ListTagsResponse,
  ReorderMessagesRequest,
  ReorderMessagesResponse,
  ReorderTagsRequest,
  ReorderTagsResponse,
  RestoreMessageRequest,
  RestoreMessageResponse,
  SendMessageRequest,
  SendMessageResponse,
  SetColorRequest,
  SetColorResponse,
  SetExpandedRequest,
  SetExpandedResponse,
  UpdateMessageRequest,
  UpdateMessageResponse,
  UseMessageRequest,
  UseMessageResponse,
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
  messages: {
    list: action<ListMessagesRequest, ListMessagesResponse>({
      path: '/api/messages/list',
    }),
    send: action<SendMessageRequest, SendMessageResponse>({
      method: 'POST',
      path: '/api/messages/send',
    }),
    update: action<UpdateMessageRequest, UpdateMessageResponse>({
      method: 'POST',
      path: '/api/messages/update',
    }),
    use: action<UseMessageRequest, UseMessageResponse>({
      method: 'POST',
      path: '/api/messages/use',
    }),
    setExpanded: action<SetExpandedRequest, SetExpandedResponse>({
      method: 'POST',
      path: '/api/messages/set-expanded',
    }),
    delete: action<DeleteMessageRequest, DeleteMessageResponse>({
      method: 'DELETE',
      path: '/api/messages/delete',
    }),
    batchDelete: action<BatchDeleteRequest, BatchDeleteResponse>({
      method: 'POST',
      path: '/api/messages/batch-delete',
    }),
    restore: action<RestoreMessageRequest, RestoreMessageResponse>({
      method: 'POST',
      path: '/api/messages/restore',
    }),
    batchRestore: action<BatchRestoreRequest, BatchRestoreResponse>({
      method: 'POST',
      path: '/api/messages/batch-restore',
    }),
    archive: action<ArchiveMessageRequest, ArchiveMessageResponse>({
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
    reorder: action<ReorderMessagesRequest, ReorderMessagesResponse>({
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
