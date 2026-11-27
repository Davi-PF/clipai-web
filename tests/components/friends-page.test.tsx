import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FriendsPage from '@/app/friends/page';
import { AppProviders } from '@/components/providers/AppProviders';
import { clearAccessToken } from '@/lib/api-client';
import { friendsService } from '@/services/friends-service';
import { invitesService } from '@/services/invites-service';
import { notificationsService } from '@/services/notifications-service';
import type { User } from '@/types/api';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const LOGGED_USER: User = {
  id: 'u1',
  username: 'fallen_br',
  email: 'gabriel@clipai.com.br',
  display_name: 'Gabriel Toledo',
  avatar_url: null,
  is_email_verified: true,
  is_2fa_enabled: false,
};

describe('FriendsPage (/friends)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    pushMock.mockReset();
    replaceMock.mockReset();

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'friends_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(LOGGED_USER), { status: 200 }));

    vi.spyOn(notificationsService, 'listNotifications').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 1,
      unread_count: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('copies personal invite link with Discord toast, manages friends/requests and searches users with debounce', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    vi.spyOn(invitesService, 'getMyInvite').mockResolvedValue({
      invite_code: 'xK9mP2qR7zAb',
      invite_url: 'https://clipai.com.br/invite/xK9mP2qR7zAb',
    });

    vi.spyOn(friendsService, 'listFriends').mockResolvedValue({
      items: [
        {
          friendship_id: 'f-1',
          since: '2026-11-20T12:00:00Z',
          user: {
            id: 'u-fer',
            username: 'fer_br',
            display_name: 'Fernando Alvarenga',
            avatar_url: null,
            discord_linked: true,
            discord_username: 'fer_god',
          },
        },
      ],
      page: 1,
      page_size: 50,
      total: 1,
      total_pages: 1,
    });

    vi.spyOn(friendsService, 'listRequests').mockResolvedValue({
      received: [
        {
          friendship_id: 'f-req-in',
          direction: 'received',
          created_at: '2026-11-27T14:00:00Z',
          user: {
            id: 'u-taco',
            username: 'taco_br',
            display_name: 'Epitácio',
            avatar_url: null,
            discord_linked: false,
            discord_username: null,
          },
        },
      ],
      sent: [
        {
          friendship_id: 'f-req-out',
          direction: 'sent',
          created_at: '2026-11-27T14:10:00Z',
          user: {
            id: 'u-boltz',
            username: 'boltz_br',
            display_name: 'Ricardo',
            avatar_url: null,
            discord_linked: false,
            discord_username: null,
          },
        },
      ],
    });

    const searchSpy = vi.spyOn(friendsService, 'searchUsers').mockResolvedValue({
      items: [
        {
          id: 'u-kscerato',
          username: 'kscerato',
          display_name: 'Kaike Cerato',
          avatar_url: null,
          discord_linked: true,
          discord_username: 'ksc_disc',
          friendship_status: 'none',
          friendship_id: null,
        },
      ],
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1,
    });

    const sendSpy = vi.spyOn(friendsService, 'sendRequest').mockResolvedValue({
      friendship_id: 'f-new',
      status: 'pending',
      auto_accepted: false,
      message: 'Pedido de amizade enviado com sucesso.',
      user: {
        id: 'u-kscerato',
        username: 'kscerato',
        display_name: 'Kaike Cerato',
        avatar_url: null,
      },
    });

    const acceptSpy = vi.spyOn(friendsService, 'acceptRequest').mockResolvedValue({
      friendship_id: 'f-req-in',
      status: 'accepted',
      message: 'Pedido de amizade aceito com sucesso.',
      user: {
        id: 'u-taco',
        username: 'taco_br',
        display_name: 'Epitácio',
        avatar_url: null,
      },
    });

    render(
      <AppProviders>
        <FriendsPage />
      </AppProviders>,
    );

    // Wait for invite card & friends list
    await waitFor(() => {
      expect(screen.getByTestId('personal-invite-url')).toHaveTextContent(
        'https://clipai.com.br/invite/xK9mP2qR7zAb',
      );
    });

    expect(screen.getByTestId('friend-card-fer_br')).toBeInTheDocument();
    expect(screen.getByTestId('discord-badge')).toHaveTextContent('@fer_god');

    // Copy invite link
    await user.click(screen.getByRole('button', { name: 'COPIAR LINK DE CONVITE' }));
    expect(writeTextMock).toHaveBeenCalledWith('https://clipai.com.br/invite/xK9mP2qR7zAb');
    expect(screen.getByText('Link copiado! Mande na call ou DM do Discord.')).toBeInTheDocument();

    // Switch to Pedidos Pendentes tab
    await user.click(screen.getByRole('tab', { name: /Pedidos Pendentes/i }));
    expect(screen.getByTestId('received-request-taco_br')).toBeInTheDocument();
    expect(screen.getByTestId('sent-request-boltz_br')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ACEITAR' }));
    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith('f-req-in');
    });

    // Switch to Buscar Pessoas tab
    await user.click(screen.getByRole('tab', { name: /Buscar Pessoas/i }));
    const searchInput = screen.getByLabelText('Buscar jogadores');
    await user.type(searchInput, 'ksc');

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith({ q: 'ksc', page: 1, page_size: 20 });
    });

    expect(await screen.findByTestId('search-result-kscerato')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ ADICIONAR AMIGO' }));
    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith('u-kscerato');
    });
    expect(await screen.findByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument();
  });
});
