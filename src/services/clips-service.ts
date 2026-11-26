import { apiClient } from '@/lib/api-client';
import type {
  Clip,
  ClipFavoriteResponse,
  ClipLikeResponse,
  ClipSummary,
  ClipViewResponse,
  Game,
  ListClipsParams,
  ListGamesParams,
  ListTagsParams,
  ListUserClipsParams,
  PaginatedResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  TagListResponse,
  UpdateClipRequest,
} from '@/types/clip';

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
}

export const clipsService = {
  async listGames(params: ListGamesParams = {}): Promise<PaginatedResponse<Game>> {
    const query = buildQueryString({
      q: params.q,
      page: params.page,
      page_size: params.page_size,
    });
    return apiClient.get<PaginatedResponse<Game>>(`/api/v1/games${query}`, {
      skipAuth: true,
      skipRefresh: true,
    });
  },

  async listTags(params: ListTagsParams = {}): Promise<TagListResponse> {
    const query = buildQueryString({
      q: params.q,
      limit: params.limit,
    });
    return apiClient.get<TagListResponse>(`/api/v1/tags${query}`, {
      skipAuth: true,
      skipRefresh: true,
    });
  },

  async requestUploadUrl(
    payload: PresignedUploadRequest,
    options?: { signal?: AbortSignal },
  ): Promise<PresignedUploadResponse> {
    return apiClient.post<PresignedUploadResponse>('/api/v1/clips/upload-url', payload, options);
  },

  async confirmUpload(clipId: string, options?: { signal?: AbortSignal }): Promise<Clip> {
    return apiClient.post<Clip>(
      `/api/v1/clips/${encodeURIComponent(clipId)}/confirm-upload`,
      undefined,
      options,
    );
  },

  async cancelUpload(clipId: string): Promise<void> {
    return apiClient.post<void>(
      `/api/v1/clips/${encodeURIComponent(clipId)}/cancel-upload`,
      undefined,
      { keepalive: true },
    );
  },

  async listClips(params: ListClipsParams = {}): Promise<PaginatedResponse<ClipSummary>> {
    const query = buildQueryString({
      q: params.q,
      game: params.game,
      game_slug: params.game_slug,
      game_id: params.game_id,
      tag: params.tag,
      author: params.author,
      mine: params.mine ? 'true' : undefined,
      favorited: params.favorited ? 'true' : undefined,
      collection_id: params.collection_id,
      sort: params.sort,
      page: params.page,
      page_size: params.page_size,
    });
    return apiClient.get<PaginatedResponse<ClipSummary>>(`/api/v1/clips${query}`);
  },

  async listUserClips(
    username: string,
    params: ListUserClipsParams = {},
  ): Promise<PaginatedResponse<ClipSummary>> {
    const query = buildQueryString({
      page: params.page,
      page_size: params.page_size,
      privacy: params.privacy,
    });
    return apiClient.get<PaginatedResponse<ClipSummary>>(
      `/api/v1/users/${encodeURIComponent(username)}/clips${query}`,
    );
  },

  async getClipBySlug(slug: string): Promise<Clip> {
    return apiClient.get<Clip>(`/api/v1/clips/${encodeURIComponent(slug)}`);
  },

  async updateClip(clipId: string, payload: UpdateClipRequest): Promise<Clip> {
    return apiClient.patch<Clip>(`/api/v1/clips/${encodeURIComponent(clipId)}`, payload);
  },

  async deleteClip(clipId: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/clips/${encodeURIComponent(clipId)}`);
  },

  async registerView(clipId: string): Promise<ClipViewResponse> {
    return apiClient.post<ClipViewResponse>(
      `/api/v1/clips/${encodeURIComponent(clipId)}/views`,
      undefined,
      {
        skipRefresh: true,
      },
    );
  },

  async toggleLike(clipId: string, currentlyLiked: boolean): Promise<ClipLikeResponse> {
    const path = `/api/v1/clips/${encodeURIComponent(clipId)}/like`;
    if (currentlyLiked) {
      return apiClient.delete<ClipLikeResponse>(path);
    }
    return apiClient.post<ClipLikeResponse>(path);
  },

  async toggleFavorite(clipId: string, currentlyFavorited: boolean): Promise<ClipFavoriteResponse> {
    const path = `/api/v1/clips/${encodeURIComponent(clipId)}/favorite`;
    if (currentlyFavorited) {
      return apiClient.delete<ClipFavoriteResponse>(path);
    }
    return apiClient.post<ClipFavoriteResponse>(path);
  },
};
