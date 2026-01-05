import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {Note} from '../types';
import {API_BASE} from '../constants';

// Создаем инстанс с базовыми настройками
const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Твой кастомный обработчик ответов (адаптированный под Axios)
async function handleResponse<T>(
  response: AxiosResponse<{result?: T; error?: string}>,
): Promise<T> {
  // В Axios данные лежат в response.data
  const body = response.data;

  // 1. Проверяем наличие ошибки, присланной бэкендом (JsonFailResponse)
  if (body && body.error) {
    throw new Error(body.error);
  }

  // 2. Проверяем наличие результата (JsonSuccessResponse)
  if (!body || body.result === undefined) {
    // Если статус 200, но результата нет — это аномалия
    throw new Error('Response does not contain a result');
  }

  // Возвращаем чистый результат (тип T)
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
      // Axios сам выставит правильный Content-Type для FormData
      config.data = params;

      if (params instanceof FormData) {
        config.headers = {
          ...config.headers,
          'Content-Type': undefined,
        };
      }
    }

    // Здесь указываем обертку { result: ResponseData; error?: string }
    return client.request<{result: ResponseData; error?: string}>(config).then(handleResponse);
  };
}

export const api = {
  messages: {
    list: action<
      {
        limit?: number;
        last_id?: number;
        last_order?: number;
        tags?: string;
        q?: string;
        archived?: string;
      },
      Note[]
    >({
      path: '/api/messages/list',
    }),
    send: action<FormData, string>({
      method: 'POST',
      path: '/api/messages/send',
    }),
    update: action<FormData, string>({
      method: 'POST',
      path: '/api/messages/update',
    }),
    delete: action<{id: number}, string>({
      method: 'DELETE',
      path: '/api/messages/delete',
    }),
    batchDelete: action<{ids: number[]}, string>({
      method: 'POST',
      path: '/api/messages/batch-delete',
    }),
    archive: action<{id: number; archive: number}, string>({
      method: 'POST',
      path: '/api/messages/archive',
    }),
    reorder: action<{ids: number[]}, string>({
      method: 'POST',
      path: '/api/messages/reorder',
    }),
  },
  tags: {
    list: action<void, string[]>({
      path: '/api/tags/list',
    }),
  },
};
