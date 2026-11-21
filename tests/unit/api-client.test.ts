import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  apiClient,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl,
  isApiErrorPayload,
  resolveApiUrl,
  setAccessToken,
} from '@/lib/api-client';

describe('api-client', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
  });

  it('manages the access token strictly in memory', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('jwt_token_123');
    expect(getAccessToken()).toBe('jwt_token_123');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it('resolves relative paths and avoids duplicating /api/v1', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:8000/api/v1');
    expect(resolveApiUrl('/health')).toBe('http://localhost:8000/api/v1/health');
    expect(resolveApiUrl('clips')).toBe('http://localhost:8000/api/v1/clips');
    expect(resolveApiUrl('/api/v1/health')).toBe('http://localhost:8000/api/v1/health');
    expect(resolveApiUrl('https://r2.cloudflarestorage.com/presigned')).toBe(
      'https://r2.cloudflarestorage.com/presigned',
    );
  });

  it('validates ApiError payloads with type guard', () => {
    expect(
      isApiErrorPayload({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha incorretos.',
          request_id: 'req_1',
        },
      }),
    ).toBe(true);

    expect(isApiErrorPayload(null)).toBe(false);
    expect(isApiErrorPayload({ error: 'invalid' })).toBe(false);
    expect(isApiErrorPayload({ detail: 'not matching contract' })).toBe(false);
  });

  it('sends credentials: include and Bearer token when authenticated', async () => {
    setAccessToken('valid_access_token');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok', version: '1.0.0', database: 'connected' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiClient.get<{ status: string }>('/health');
    expect(result.status).toBe('ok');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('http://localhost:8000/api/v1/health');
    expect(calledInit.credentials).toBe('include');
    const headers = calledInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer valid_access_token');
  });

  it('supports POST, PATCH and DELETE (204 No Content)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'clip_1' }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'clip_1', title: 'Novo' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const created = await apiClient.post<{ id: string }>('/clips', { title: 'Clutch' });
    expect(created.id).toBe('clip_1');

    const updated = await apiClient.patch<{ title: string }>('/clips/clip_1', { title: 'Novo' });
    expect(updated.title).toBe('Novo');

    const deleted = await apiClient.delete<void>('/clips/clip_1');
    expect(deleted).toBeUndefined();
  });

  it('parses standardized ApiError responses into ApiClientError with PT-BR messages', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'O tamanho do arquivo excede o limite máximo permitido.',
            details: [{ field: 'video_size_bytes', message: 'Máximo 100 MB.' }],
            request_id: 'req_99',
          },
        }),
        { status: 413 },
      ),
    );

    await expect(apiClient.post('/clips/upload-url', {})).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: 'O tamanho do arquivo excede o limite máximo permitido.',
      requestId: 'req_99',
    });
  });

  it('handles network errors and non-JSON error responses gracefully', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      status: 0,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Falha de conexão com a API do CLIPAÍ. Verifique se o servidor está ativo.',
    });

    fetchMock.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));

    await expect(apiClient.get('/health')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('executes single-flight token refresh on 401 TOKEN_EXPIRED and retries original request', async () => {
    setAccessToken('expired_token');

    fetchMock
      // 1. Original request fails with 401 TOKEN_EXPIRED
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Sua sessão expirou. Faça login novamente.',
              request_id: 'req_exp',
            },
          }),
          { status: 401 },
        ),
      )
      // 2. Refresh endpoint succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'fresh_token_456',
            token_type: 'bearer',
            expires_in: 900,
          }),
          { status: 200 },
        ),
      )
      // 3. Retried request succeeds
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'user_1', username: 'fallen_br' }), { status: 200 }),
      );

    const user = await apiClient.get<{ username: string }>('/users/me');
    expect(user.username).toBe('fallen_br');
    expect(getAccessToken()).toBe('fresh_token_456');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears token and throws when refresh token rotation fails', async () => {
    setAccessToken('expired_token');

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Sua sessão expirou. Faça login novamente.',
              request_id: 'req_exp_2',
            },
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token de autenticação inválido ou revogado.',
              request_id: 'req_revoked',
            },
          }),
          { status: 401 },
        ),
      );

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
    });
    expect(getAccessToken()).toBeNull();
  });
});
