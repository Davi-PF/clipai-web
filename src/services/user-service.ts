import { apiClient } from '@/lib/api-client';
import { uploadFileToPresignedUrl } from '@/lib/r2-upload';
import type {
  AvatarConfirmRequest,
  AvatarMimeType,
  AvatarUploadUrlRequest,
  AvatarUploadUrlResponse,
  ClipSummary,
  Collection,
  CollectionVisibility,
  DiscordAuthUrlResponse,
  PaginatedResponse,
  PublicUserProfile,
  User,
  UserUpdateRequest,
} from '@/types/api';
import type { ListUserClipsParams } from '@/types/clip';

function buildPaginationQuery(params?: {
  page?: number;
  page_size?: number;
  privacy?: string;
}): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  if (typeof params.page === 'number') {
    search.set('page', String(params.page));
  }
  if (typeof params.page_size === 'number') {
    search.set('page_size', String(params.page_size));
  }
  if (params.privacy) {
    search.set('privacy', params.privacy);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const userService = {
  async getMe(): Promise<User> {
    return apiClient.get<User>('/api/v1/users/me');
  },

  async updateProfile(payload: UserUpdateRequest): Promise<User> {
    return apiClient.patch<User>('/api/v1/users/me', payload);
  },

  async updateCollectionsVisibility(collectionsVisibility: CollectionVisibility): Promise<User> {
    return this.updateProfile({ collections_visibility: collectionsVisibility });
  },

  async createAvatarUploadUrl(payload: AvatarUploadUrlRequest): Promise<AvatarUploadUrlResponse> {
    return apiClient.post<AvatarUploadUrlResponse>('/api/v1/users/me/avatar/upload-url', payload);
  },

  async confirmAvatarUpload(payload: AvatarConfirmRequest): Promise<User> {
    return apiClient.post<User>('/api/v1/users/me/avatar/confirm', payload);
  },

  async uploadAvatar(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<User> {
    const mimeType = file.type.trim().toLowerCase() as AvatarMimeType;
    const presigned = await this.createAvatarUploadUrl({
      mime_type: mimeType,
      size_bytes: file.size,
    });

    const uploadTargetUrl = presigned.avatar_upload?.url || presigned.upload_url;
    const contentType = presigned.avatar_upload?.headers?.['Content-Type'] || mimeType;

    await uploadFileToPresignedUrl(
      uploadTargetUrl,
      file,
      contentType,
      onProgress ?? (() => undefined),
      signal,
    );

    const avatarKey = presigned.avatar_key || presigned.object_key;
    return this.confirmAvatarUpload({ avatar_key: avatarKey });
  },

  async getDiscordLinkUrl(): Promise<DiscordAuthUrlResponse> {
    return apiClient.get<DiscordAuthUrlResponse>('/api/v1/auth/discord/url?mode=link');
  },

  async unlinkDiscord(): Promise<User> {
    return apiClient.delete<User>('/api/v1/users/me/discord');
  },

  async useDiscordAvatar(): Promise<User> {
    return apiClient.post<User>('/api/v1/users/me/discord/use-avatar');
  },

  async getPublicProfile(username: string): Promise<PublicUserProfile> {
    const safeUsername = encodeURIComponent(username.trim());
    return apiClient.get<PublicUserProfile>(`/api/v1/users/${safeUsername}`);
  },

  async listUserClips(
    username: string,
    params?: ListUserClipsParams,
  ): Promise<PaginatedResponse<ClipSummary>> {
    const safeUsername = encodeURIComponent(username.trim());
    const qs = buildPaginationQuery(params);
    return apiClient.get<PaginatedResponse<ClipSummary>>(
      `/api/v1/users/${safeUsername}/clips${qs}`,
    );
  },

  async listUserCollections(
    username: string,
    params?: { page?: number; page_size?: number },
  ): Promise<PaginatedResponse<Collection>> {
    const safeUsername = encodeURIComponent(username.trim());
    const qs = buildPaginationQuery(params);
    return apiClient.get<PaginatedResponse<Collection>>(
      `/api/v1/users/${safeUsername}/collections${qs}`,
    );
  },
};
