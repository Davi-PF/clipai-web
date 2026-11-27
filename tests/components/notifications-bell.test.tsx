import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { ToastViewport } from '@/components/ui/Toast';
import { ToastProvider } from '@/contexts/toast-context';
import { friendsService } from '@/services/friends-service';
import { notificationsService } from '@/services/notifications-service';
import type { NotificationListResponse } from '@/types/notification';

const SAMPLE_NOTIFICATIONS: NotificationListResponse = {
  items: [
    {
      id: 'notif-1',
      type: 'friend_request',
      entity_id: 'friendship-1',
      is_read: false,
      created_at: new Date().toISOString(),
      actor: {
        id: 'u-2',
        username: 'fer_br',
        display_name: 'Fernando',
        avatar_url: null,
      },
    },
    {
      id: 'notif-2',
      type: 'friend_accepted',
      entity_id: 'friendship-2',
      is_read: false,
      created_at: new Date(Date.now() - 3600_000).toISOString(),
      actor: {
        id: 'u-3',
        username: 'fnx_br',
        display_name: 'Lincoln',
        avatar_url: null,
      },
    },
  ],
  page: 1,
  page_size: 20,
  total: 2,
  total_pages: 1,
  unread_count: 2,
};

function renderBell() {
  return render(
    <ToastProvider>
      <NotificationsBell />
      <ToastViewport />
    </ToastProvider>,
  );
}

describe('NotificationsBell popover & quick actions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows unread badge, accepts friend_request directly in popover and marks all as read', async () => {
    const user = userEvent.setup();

    const listSpy = vi
      .spyOn(notificationsService, 'listNotifications')
      .mockResolvedValue(SAMPLE_NOTIFICATIONS);

    const acceptSpy = vi.spyOn(friendsService, 'acceptRequest').mockResolvedValueOnce({
      friendship_id: 'friendship-1',
      status: 'accepted',
      message: 'Pedido de amizade aceito com sucesso.',
      user: {
        id: 'u-2',
        username: 'fer_br',
        display_name: 'Fernando',
        avatar_url: null,
      },
    });

    const markAllSpy = vi.spyOn(notificationsService, 'markAllAsRead').mockResolvedValueOnce({
      updated_count: 1,
      message: 'Todas as notificações foram marcadas como lidas.',
    });

    renderBell();

    await waitFor(() => {
      expect(screen.getByTestId('notifications-unread-badge')).toHaveTextContent('2');
    });

    // Open popover
    await user.click(screen.getByTestId('notifications-bell-button'));
    expect(screen.getByTestId('notifications-popover')).toBeInTheDocument();
    expect(screen.getByText(/enviou um pedido de amizade/i)).toBeInTheDocument();
    expect(screen.getByText(/aceitou seu pedido de amizade/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver perfil de @fnx_br' })).toHaveAttribute(
      'href',
      '/u/fnx_br',
    );

    // Accept friend request right inside notification popover
    await user.click(screen.getByRole('button', { name: 'ACEITAR' }));

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith('friendship-1');
    });

    expect(screen.getByText('Pedido aceito ✓')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-unread-badge')).toHaveTextContent('1');

    // Mark all as read
    await user.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalledOnce();
    });

    expect(screen.queryByTestId('notifications-unread-badge')).not.toBeInTheDocument();
    expect(
      screen.getByText('Todas as notificações foram marcadas como lidas.'),
    ).toBeInTheDocument();

    // Window focus triggers revalidation
    const callCountBeforeFocus = listSpy.mock.calls.length;
    fireEvent.focus(window);
    await waitFor(() => {
      expect(listSpy.mock.calls.length).toBeGreaterThan(callCountBeforeFocus);
    });
  });

  it('declines friend_request inside popover and displays empty state when list is empty', async () => {
    const user = userEvent.setup();

    vi.spyOn(notificationsService, 'listNotifications').mockResolvedValueOnce({
      items: [SAMPLE_NOTIFICATIONS.items[0]!],
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1,
      unread_count: 1,
    });

    const removeSpy = vi.spyOn(friendsService, 'removeFriendship').mockResolvedValueOnce(undefined);

    const { unmount } = renderBell();

    await waitFor(() => {
      expect(screen.getByTestId('notifications-unread-badge')).toHaveTextContent('1');
    });

    await user.click(screen.getByTestId('notifications-bell-button'));
    await user.click(screen.getByRole('button', { name: 'RECUSAR' }));

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('friendship-1');
    });
    expect(screen.getByText('Pedido recusado')).toBeInTheDocument();
    unmount();

    // Empty state
    vi.spyOn(notificationsService, 'listNotifications').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 1,
      unread_count: 0,
    });

    renderBell();
    await user.click(screen.getByTestId('notifications-bell-button'));

    await waitFor(() => {
      expect(screen.getByTestId('notifications-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('NENHUMA NOTIFICAÇÃO')).toBeInTheDocument();
  });
});
