export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HTTPError extends Error {
  constructor(
    public statusCode: number,
    public statusMessage: string,
  ) {
    super(`Response code ${statusCode} (${statusMessage})`);
    this.name = 'HTTPError';
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);

  // Если бэкенд прислал ошибку в формате {error: "text"}
  if (body !== null && typeof body === 'object' && 'error' in body) {
    throw new ApiError(body.error);
  }

  if (!response.ok) {
    throw new HTTPError(response.status, response.statusText);
  }

  if (body === null) {
    throw new Error('Empty body');
  }

  // Твой бэкенд сейчас возвращает данные напрямую (без поля .result)
  // Поэтому возвращаем body целиком как T
  return body as T;
}
