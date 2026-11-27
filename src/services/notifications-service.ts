import { apiClient } from '@/lib/api-client';
import type {
  MarkAllNotificationsReadResponse,
  NotificationItem,
  NotificationListResponse,
} from '@/types/notification';

function buildQuery(params?: { unread_only?: boolean; page?: number; page_size?: number }): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  if (typeof params.unread_only === 'boolean') {
    search.set('unread_only', String(params.unread_only));
  }
  if (typeof params.page === 'number') {
    search.set('page', String(params.page));
  }
  if (typeof params.page_size === 'number') {
    search.set('page_size', String(params.page_size));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const notificationsService = {
  async listNotifications(params?: {
    unread_only?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<NotificationListResponse> {
    const qs = buildQuery(params);
    return apiClient.get<NotificationListResponse>(`/api/v1/notifications${qs}`);
  },

  async markAsRead(notificationId: string): Promise<NotificationItem> {
    const safeId = encodeURIComponent(notificationId.trim());
    return apiClient.patch<NotificationItem>(`/api/v1/notifications/${safeId}/read`);
  },

  async markAllAsRead(): Promise<MarkAllNotificationsReadResponse> {
    return apiClient.post<MarkAllNotificationsReadResponse>('/api/v1/notifications/read-all');
  },
};
