import { apiClient } from '@/lib/api-client';
import type {
  AddClipToCollectionResponse,
  Collection,
  CollectionDetail,
  CreateCollectionRequest,
  ListCollectionsParams,
  PaginatedResponse,
  UpdateCollectionRequest,
} from '@/types/collection';

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

export const collectionsService = {
  async listCollections(
    params: ListCollectionsParams = {},
  ): Promise<PaginatedResponse<Collection>> {
    const query = buildQueryString({
      mine: params.mine ? 'true' : undefined,
      author: params.author,
      page: params.page,
      page_size: params.page_size,
    });
    return apiClient.get<PaginatedResponse<Collection>>(`/api/v1/collections${query}`);
  },

  async listUserCollections(
    username: string,
    params: { page?: number; page_size?: number } = {},
  ): Promise<PaginatedResponse<Collection>> {
    const query = buildQueryString({
      page: params.page,
      page_size: params.page_size,
    });
    return apiClient.get<PaginatedResponse<Collection>>(
      `/api/v1/users/${encodeURIComponent(username)}/collections${query}`,
    );
  },

  async getCollection(
    collectionId: string,
    params: { page?: number; page_size?: number } = {},
  ): Promise<CollectionDetail> {
    const query = buildQueryString({
      page: params.page,
      page_size: params.page_size,
    });
    return apiClient.get<CollectionDetail>(
      `/api/v1/collections/${encodeURIComponent(collectionId)}${query}`,
    );
  },

  async createCollection(payload: CreateCollectionRequest): Promise<Collection> {
    return apiClient.post<Collection>('/api/v1/collections', payload);
  },

  async updateCollection(
    collectionId: string,
    payload: UpdateCollectionRequest,
  ): Promise<Collection> {
    return apiClient.patch<Collection>(
      `/api/v1/collections/${encodeURIComponent(collectionId)}`,
      payload,
    );
  },

  async deleteCollection(collectionId: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/collections/${encodeURIComponent(collectionId)}`);
  },

  async addClipToCollection(
    collectionId: string,
    clipId: string,
    position?: number,
  ): Promise<AddClipToCollectionResponse> {
    return apiClient.post<AddClipToCollectionResponse>(
      `/api/v1/collections/${encodeURIComponent(collectionId)}/clips`,
      position !== undefined ? { clip_id: clipId, position } : { clip_id: clipId },
    );
  },

  async removeClipFromCollection(collectionId: string, clipId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/v1/collections/${encodeURIComponent(collectionId)}/clips/${encodeURIComponent(clipId)}`,
    );
  },
};
