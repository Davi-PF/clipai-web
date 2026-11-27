'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useOptionalNotifications } from '@/contexts/notifications-context';
import {
  useNotificationsController,
  type NotificationResolution,
} from '@/hooks/useNotificationsController';
import type { NotificationItem } from '@/types/notification';

export interface NotificationsBellProps {
  placement?: 'right-start' | 'bottom-right';
  compact?: boolean;
  disableStandaloneAutoFetch?: boolean;
}

function formatRelativeTimePtBr(isoDate: string): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return '';
  }
  const diffSeconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSeconds < 60) {
    return 'agora';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `há ${diffDays}d`;
  }
  return new Date(parsed).toLocaleDateString('pt-BR');
}

interface NotificationRowProps {
  item: NotificationItem;
  resolution?: NotificationResolution;
  isPending: boolean;
  onAccept: (item: NotificationItem) => void;
  onDecline: (item: NotificationItem) => void;
  onNavigateProfile: (item: NotificationItem) => void;
}

function NotificationRow({
  item,
  resolution,
  isPending,
  onAccept,
  onDecline,
  onNavigateProfile,
}: Readonly<NotificationRowProps>) {
  const relativeTime = formatRelativeTimePtBr(item.created_at);
  const profileHref = `/u/${encodeURIComponent(item.actor.username)}`;
  const showFriendRequestActions = item.type === 'friend_request' && !item.is_read && !resolution;

  return (
    <li
      data-testid={`notification-item-${item.id}`}
      className={`rounded-card border p-3 transition-colors ${
        item.is_read
          ? 'border-border-muted/60 bg-bg-deep/60'
          : 'border-border-muted bg-bg-elevated/55'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Link
          href={profileHref}
          onClick={() => onNavigateProfile(item)}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <UserAvatar
            username={item.actor.username}
            displayName={item.actor.display_name}
            avatarUrl={item.actor.avatar_url}
            size="sm"
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-mono-meta leading-snug text-text-primary">
              <Link
                href={profileHref}
                onClick={() => onNavigateProfile(item)}
                className="font-semibold text-text-primary transition-colors hover:text-success hover:underline"
              >
                @{item.actor.username}
              </Link>{' '}
              {item.type === 'friend_request'
                ? 'enviou um pedido de amizade'
                : 'aceitou seu pedido de amizade'}
            </p>
            {!item.is_read && (
              <span
                aria-label="Não lida"
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success"
              />
            )}
          </div>

          {relativeTime && (
            <p className="font-mono text-mono-badge text-text-muted">{relativeTime}</p>
          )}

          {showFriendRequestActions && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isPending}
                loadingText="ACEITANDO..."
                leftIcon={<Check className="h-3.5 w-3.5" />}
                onClick={() => onAccept(item)}
                className="min-h-8 px-3 py-1 text-mono-badge"
              >
                ACEITAR
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                typography="display"
                disabled={isPending}
                leftIcon={<X className="h-3.5 w-3.5" />}
                onClick={() => onDecline(item)}
                className="min-h-8 border border-danger/70 px-3 py-1 text-mono-badge text-danger-text hover:border-danger hover:bg-danger-surface hover:text-text-primary"
              >
                RECUSAR
              </Button>
            </div>
          )}

          {resolution === 'accepted' && (
            <p className="font-mono text-mono-badge font-semibold text-success">Pedido aceito ✓</p>
          )}

          {resolution === 'declined' && (
            <p className="font-mono text-mono-badge text-text-muted">Pedido recusado</p>
          )}

          {item.type === 'friend_accepted' && (
            <Link
              href={profileHref}
              onClick={() => onNavigateProfile(item)}
              className="inline-flex items-center font-mono text-mono-badge text-success hover:underline"
            >
              Ver perfil de @{item.actor.username}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function NotificationsBell({
  placement = 'bottom-right',
  compact = false,
  disableStandaloneAutoFetch = false,
}: Readonly<NotificationsBellProps>) {
  const sharedController = useOptionalNotifications();
  const localController = useNotificationsController({
    enabled: !sharedController && !disableStandaloneAutoFetch,
  });
  const controller = sharedController ?? localController;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      void controller.refreshNotifications({ silent: controller.notifications.length > 0 });
    }
  };

  const badgeLabel = controller.unreadCount > 99 ? '99+' : String(controller.unreadCount);
  const popoverPositionClass =
    placement === 'right-start'
      ? 'left-full top-0 ml-3 w-[360px] max-w-[calc(100vw-6rem)]'
      : 'right-0 top-full mt-2 w-[min(360px,calc(100vw-1.5rem))]';

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        data-testid="notifications-bell-button"
        aria-label={
          controller.unreadCount > 0
            ? `Notificações (${controller.unreadCount} não lidas)`
            : 'Notificações'
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Notificações"
        onClick={handleToggle}
        className={`relative inline-flex items-center justify-center border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${
          compact ? 'h-10 w-10 rounded-full' : 'h-9 w-9 rounded-control'
        }`}
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
        {controller.unreadCount > 0 && (
          <span
            data-testid="notifications-unread-badge"
            className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-bg-surface bg-danger px-1 font-mono text-[10px] font-bold leading-none text-text-primary"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Caixa de notificações"
          data-testid="notifications-popover"
          className={`absolute z-50 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4 text-text-primary shadow-2xl ${popoverPositionClass}`}
        >
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-border-muted pb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                NOTIFICAÇÕES
              </h2>
              {controller.unreadCount > 0 && (
                <span className="rounded-control bg-danger px-1.5 py-0.5 font-mono text-mono-badge font-bold text-text-primary">
                  {badgeLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={controller.unreadCount === 0 || controller.isMarkingAll}
              onClick={() => void controller.markAllAsRead()}
              className="inline-flex items-center gap-1 rounded-control px-2 py-1 font-mono text-mono-badge text-success transition-colors hover:bg-bg-elevated disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
            >
              <CheckCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Marcar todas como lidas</span>
            </button>
          </div>

          {controller.isLoading && controller.notifications.length === 0 ? (
            <div aria-busy="true" className="space-y-2.5 py-2">
              {[1, 2].map((idx) => (
                <div
                  key={idx}
                  className="h-16 animate-pulse rounded-card border border-border-muted bg-bg-elevated"
                />
              ))}
            </div>
          ) : controller.notifications.length === 0 ? (
            <div
              data-testid="notifications-empty-state"
              className="flex flex-col items-center gap-2 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep px-4 py-7 text-center"
            >
              <Bell className="h-7 w-7 text-text-muted" aria-hidden="true" />
              <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                NENHUMA NOTIFICAÇÃO
              </p>
              <p className="font-mono text-mono-badge text-text-secondary">
                Você está em dia! Pedidos de amizade e confirmações aparecerão aqui.
              </p>
            </div>
          ) : (
            <ul
              aria-label="Lista de notificações"
              className="custom-scrollbar max-h-[360px] space-y-2.5 overflow-y-auto pr-0.5"
            >
              {controller.notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  resolution={controller.resolvedActions[item.id]}
                  isPending={controller.pendingNotificationId === item.id}
                  onAccept={(target) => void controller.acceptFriendRequest(target)}
                  onDecline={(target) => void controller.declineFriendRequest(target)}
                  onNavigateProfile={(target) => {
                    void controller.markAsRead(target);
                    setIsOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
