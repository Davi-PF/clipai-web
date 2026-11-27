import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/api';
import type {
  FriendItem,
  FriendRequestsResponse,
  FriendshipActionResponse,
  UserSearchItem,
} from '@/types/friendship';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const friendsService = {
  async listFriends(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<FriendItem>> {
    const qs = buildQuery({
      page: params?.page,
      page_size: params?.page_size,
    });
    return apiClient.get<PaginatedResponse<FriendItem>>(`/api/v1/friends${qs}`);
  },

  async listRequests(): Promise<FriendRequestsResponse> {
    return apiClient.get<FriendRequestsResponse>('/api/v1/friends/requests');
  },

  async sendRequest(userId: string): Promise<FriendshipActionResponse> {
    const safeUserId = encodeURIComponent(userId.trim());
    return apiClient.post<FriendshipActionResponse>(`/api/v1/friends/request/${safeUserId}`);
  },

  async acceptRequest(friendshipId: string): Promise<FriendshipActionResponse> {
    const safeFriendshipId = encodeURIComponent(friendshipId.trim());
    return apiClient.post<FriendshipActionResponse>(`/api/v1/friends/${safeFriendshipId}/accept`);
  },

  async removeFriendship(friendshipId: string): Promise<void> {
    const safeFriendshipId = encodeURIComponent(friendshipId.trim());
    return apiClient.delete<void>(`/api/v1/friends/${safeFriendshipId}`);
  },

  async searchUsers(params: {
    q: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<UserSearchItem>> {
    const qs = buildQuery({
      q: params.q.trim(),
      page: params.page,
      page_size: params.page_size,
    });
    return apiClient.get<PaginatedResponse<UserSearchItem>>(`/api/v1/users/search${qs}`);
  },
};
