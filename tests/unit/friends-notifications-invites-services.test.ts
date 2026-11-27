import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/lib/api-client';
import {
  acceptPendingInviteIfPresent,
  capturePendingInviteCode,
  clearPendingInviteCode,
  getInviteCodeFromSearch,
  getPendingInviteCode,
  PENDING_INVITE_STORAGE_KEY,
  savePendingInviteCode,
} from '@/lib/pending-invite';
import { friendsService } from '@/services/friends-service';
import { invitesService } from '@/services/invites-service';
import { notificationsService } from '@/services/notifications-service';

describe('friendsService, notificationsService, invitesService & pending-invite', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('jwt_social_token');
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
    window.sessionStorage.clear();
  });

  it('calls all friendsService endpoints with expected methods, paths and query strings', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [], page: 2, page_size: 10, total: 0, total_pages: 1 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ received: [], sent: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            friendship_id: 'f-1',
            status: 'pending',
            auto_accepted: false,
            message: 'Pedido enviado.',
            user: { id: 'u2', username: 'fer_br', display_name: 'Fer', avatar_url: null },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            friendship_id: 'f-1',
            status: 'accepted',
            message: 'Pedido aceito.',
            user: { id: 'u2', username: 'fer_br', display_name: 'Fer', avatar_url: null },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [], page: 1, page_size: 20, total: 0, total_pages: 1 }),
          { status: 200 },
        ),
      );

    await friendsService.listFriends({ page: 2, page_size: 10 });
    await friendsService.listRequests();
    await friendsService.sendRequest('u2');
    await friendsService.acceptRequest('f-1');
    await friendsService.removeFriendship('f-1');
    await friendsService.searchUsers({ q: ' @fallen ', page: 1, page_size: 20 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/friends?page=2&page_size=10'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/friends/requests'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/friends/request/u2'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/friends/f-1/accept'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('/friends/f-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining('/users/search?q=%40fallen&page=1&page_size=20'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('calls all notificationsService endpoints correctly', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            page_size: 15,
            total: 0,
            total_pages: 1,
            unread_count: 0,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'n-1',
            type: 'friend_accepted',
            entity_id: 'f-1',
            is_read: true,
            created_at: '2026-11-27T15:00:00Z',
            actor: { id: 'u2', username: 'fer_br', display_name: 'Fer', avatar_url: null },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            updated_count: 3,
            message: 'Todas as notificações foram marcadas como lidas.',
          }),
          { status: 200 },
        ),
      );

    await notificationsService.listNotifications({ unread_only: true, page: 1, page_size: 15 });
    await notificationsService.markAsRead('n-1');
    await notificationsService.markAllAsRead();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/notifications?unread_only=true&page=1&page_size=15'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/notifications/n-1/read'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/notifications/read-all'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls all invitesService endpoints and skips auth on public invite preview', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            invite_code: 'abc123',
            invite_url: 'https://clipai.com.br/invite/abc123',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            invite_code: 'abc123',
            username: 'fallen_br',
            display_name: 'FalleN',
            avatar_url: null,
            discord_username: 'fallen_disc',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            friendship_id: 'f-9',
            status: 'accepted',
            already_friends: false,
            message: 'Convite aceito! Vocês agora são amigos.',
            inviter: {
              id: 'u1',
              username: 'fallen_br',
              display_name: 'FalleN',
              avatar_url: null,
            },
          }),
          { status: 200 },
        ),
      );

    await invitesService.getMyInvite();
    await invitesService.getInvitePreview('abc123');
    await invitesService.acceptInvite('abc123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/invites/me'),
      expect.objectContaining({ method: 'GET' }),
    );

    const previewInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const previewHeaders = previewInit.headers as Headers;
    expect(previewHeaders.get('Authorization')).toBeNull();

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/invites/abc123/accept'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('manages pending invite codes in sessionStorage and URL search params', async () => {
    expect(getPendingInviteCode()).toBeNull();
    expect(getInviteCodeFromSearch('?invite=xK9mP2')).toBe('xK9mP2');

    savePendingInviteCode('  code77  ');
    expect(window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY)).toBe('code77');
    expect(getPendingInviteCode()).toBe('code77');

    expect(capturePendingInviteCode('?invite=fromUrl99')).toBe('fromUrl99');
    expect(getPendingInviteCode()).toBe('fromUrl99');

    const acceptSpy = vi.spyOn(invitesService, 'acceptInvite').mockResolvedValueOnce({
      friendship_id: 'f-77',
      status: 'accepted',
      already_friends: false,
      message: 'Convite aceito! Vocês agora são amigos.',
      inviter: {
        id: 'u1',
        username: 'fallen_br',
        display_name: 'FalleN',
        avatar_url: null,
      },
    });

    const result = await acceptPendingInviteIfPresent();
    expect(acceptSpy).toHaveBeenCalledWith('fromUrl99');
    expect(result?.inviter.username).toBe('fallen_br');
    expect(getPendingInviteCode()).toBeNull();

    // Handles API failure gracefully and still clears code
    savePendingInviteCode('brokenCode');
    acceptSpy.mockRejectedValueOnce(new Error('404'));
    expect(await acceptPendingInviteIfPresent()).toBeNull();
    expect(getPendingInviteCode()).toBeNull();

    clearPendingInviteCode();
    expect(await acceptPendingInviteIfPresent()).toBeNull();
  });
});
