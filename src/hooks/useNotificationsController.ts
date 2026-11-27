'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { friendsService } from '@/services/friends-service';
import { notificationsService } from '@/services/notifications-service';
import type { NotificationItem } from '@/types/notification';

const POLL_INTERVAL_MS = 60_000;
const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationResolution = 'accepted' | 'declined';

export interface NotificationsController {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isMarkingAll: boolean;
  pendingNotificationId: string | null;
  resolvedActions: Record<string, NotificationResolution>;
  refreshNotifications: (options?: { silent?: boolean }) => Promise<void>;
  acceptFriendRequest: (item: NotificationItem) => Promise<void>;
  declineFriendRequest: (item: NotificationItem) => Promise<void>;
  markAsRead: (item: NotificationItem) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotificationsController(options: {
  enabled: boolean;
  pollIntervalMs?: number;
}): NotificationsController {
  const { enabled, pollIntervalMs = POLL_INTERVAL_MS } = options;
  const toast = useOptionalToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const [resolvedActions, setResolvedActions] = useState<Record<string, NotificationResolution>>(
    {},
  );
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshNotifications = useCallback(
    async (fetchOptions?: { silent?: boolean }) => {
      if (!enabled) {
        return;
      }
      if (!fetchOptions?.silent) {
        setIsLoading(true);
      }
      try {
        const response = await notificationsService.listNotifications({
          page: 1,
          page_size: NOTIFICATIONS_PAGE_SIZE,
        });
        if (!isMountedRef.current) {
          return;
        }
        setNotifications(response.items);
        setUnreadCount(response.unread_count);
      } catch {
        // Silent fallback on background polling/revalidation
      } finally {
        if (isMountedRef.current && !fetchOptions?.silent) {
          setIsLoading(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setResolvedActions({});
      return;
    }

    void refreshNotifications();

    const intervalId = setInterval(() => {
      void refreshNotifications({ silent: true });
    }, pollIntervalMs);

    const handleFocus = () => {
      void refreshNotifications({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications({ silent: true });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, pollIntervalMs, refreshNotifications]);

  const markItemReadLocally = useCallback((notificationId: string, wasUnread: boolean) => {
    setNotifications((prev) =>
      prev.map((entry) => (entry.id === notificationId ? { ...entry, is_read: true } : entry)),
    );
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const acceptFriendRequest = useCallback(
    async (item: NotificationItem) => {
      setPendingNotificationId(item.id);
      try {
        const res = await friendsService.acceptRequest(item.entity_id);
        markItemReadLocally(item.id, !item.is_read);
        setResolvedActions((prev) => ({ ...prev, [item.id]: 'accepted' }));
        toast?.success(res.message || `Você e @${item.actor.username} agora são amigos!`);
      } catch (err: unknown) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível aceitar o pedido de amizade.';
        toast?.error(message);
      } finally {
        if (isMountedRef.current) {
          setPendingNotificationId(null);
        }
      }
    },
    [markItemReadLocally, toast],
  );

  const declineFriendRequest = useCallback(
    async (item: NotificationItem) => {
      setPendingNotificationId(item.id);
      try {
        await friendsService.removeFriendship(item.entity_id);
        markItemReadLocally(item.id, !item.is_read);
        setResolvedActions((prev) => ({ ...prev, [item.id]: 'declined' }));
        toast?.success(`Pedido de @${item.actor.username} recusado.`);
      } catch (err: unknown) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível recusar o pedido de amizade.';
        toast?.error(message);
      } finally {
        if (isMountedRef.current) {
          setPendingNotificationId(null);
        }
      }
    },
    [markItemReadLocally, toast],
  );

  const markAsRead = useCallback(
    async (item: NotificationItem) => {
      if (item.is_read) {
        return;
      }
      try {
        await notificationsService.markAsRead(item.id);
        markItemReadLocally(item.id, true);
      } catch {
        // Ignore non-critical read marker failure
      }
    },
    [markItemReadLocally],
  );

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0 || isMarkingAll) {
      return;
    }
    setIsMarkingAll(true);
    try {
      const res = await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
      setUnreadCount(0);
      toast?.success(res.message || 'Todas as notificações foram marcadas como lidas.');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível marcar as notificações como lidas.';
      toast?.error(message);
    } finally {
      if (isMountedRef.current) {
        setIsMarkingAll(false);
      }
    }
  }, [unreadCount, isMarkingAll, toast]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isMarkingAll,
    pendingNotificationId,
    resolvedActions,
    refreshNotifications,
    acceptFriendRequest,
    declineFriendRequest,
    markAsRead,
    markAllAsRead,
  };
}
