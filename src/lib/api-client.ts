import type { ApiError, ApiErrorCode, ApiErrorDetail, AuthRefreshResponse } from '@/types/api';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

const NON_REFRESHABLE_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/2fa/verify-login',
  '/auth/2fa/verify',
] as const;

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details: ApiErrorDetail[];
  public readonly requestId: string;

  constructor(params: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? [];
    this.requestId = params.requestId ?? 'req_unknown';
  }
}

export function isApiErrorPayload(payload: unknown): payload is ApiError {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) {
    return false;
  }
  const errorObj = (payload as { error: unknown }).error;
  if (typeof errorObj !== 'object' || errorObj === null) {
    return false;
  }
  const candidate = errorObj as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

export function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return configured.replace(/\/+$/, '');
}

export function resolveApiUrl(path: string, baseUrl: string = getApiBaseUrl()): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedBase.endsWith('/api/v1') && normalizedPath.startsWith('/api/v1/')) {
    return `${normalizedBase}${normalizedPath.slice('/api/v1'.length)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

function buildHeaders(options: ApiRequestOptions): Headers {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!options.skipAuth && inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  return headers;
}

async function parseErrorResponse(response: Response): Promise<ApiClientError> {
  try {
    const data: unknown = await response.json();
    if (isApiErrorPayload(data)) {
      return new ApiClientError({
        status: response.status,
        code: data.error.code,
        message: data.error.message,
        details: data.error.details,
        requestId: data.error.request_id,
      });
    }
  } catch {
    // Fallback below when response body is not valid JSON
  }

  return new ApiClientError({
    status: response.status,
    code: response.status === 401 ? 'INVALID_TOKEN' : 'INTERNAL_SERVER_ERROR',
    message: 'Não foi possível comunicar com o servidor. Tente novamente em instantes.',
  });
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(resolveApiUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        clearAccessToken();
        return null;
      }

      const data = (await response.json()) as AuthRefreshResponse;
      if (typeof data.access_token === 'string' && data.access_token.length > 0) {
        setAccessToken(data.access_token);
        return data.access_token;
      }

      clearAccessToken();
      return null;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isNonRefreshablePath(path: string): boolean {
  return NON_REFRESHABLE_AUTH_PATHS.some((authPath) => path.includes(authPath));
}

function shouldAttemptRefresh(
  path: string,
  options: ApiRequestOptions,
  error: ApiClientError,
): boolean {
  if (options.skipRefresh || options.skipAuth || isNonRefreshablePath(path)) {
    return false;
  }
  return error.status === 401 && error.code !== 'INVALID_CREDENTIALS';
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = resolveApiUrl(path);
  const headers = buildHeaders(options);
  const serializedBody =
    options.body !== undefined && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : (options.body as BodyInit | undefined);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: serializedBody,
      credentials: options.credentials ?? 'include',
    });
  } catch {
    throw new ApiClientError({
      status: 0,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Falha de conexão com a API do CLIPAÍ. Verifique se o servidor está ativo.',
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const apiError = await parseErrorResponse(response);

    if (shouldAttemptRefresh(path, options, apiError)) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiRequest<T>(path, { ...options, skipRefresh: true });
      }
      unauthorizedHandler?.();
    }

    throw apiError;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions): Promise<T> =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: ApiRequestOptions): Promise<T> =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
