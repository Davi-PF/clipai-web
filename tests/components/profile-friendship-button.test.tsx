import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicProfileView } from '@/components/profile/PublicProfileView';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { clearAccessToken } from '@/lib/api-client';
import { friendsService } from '@/services/friends-service';
import { userService } from '@/services/user-service';
import type { PublicUserProfile, User } from '@/types/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const CURRENT_USER: User = {
  id: 'u-me',
  username: 'coldzera_br',
  email: 'cold@clipai.com.br',
  display_name: 'Marcelo David',
  avatar_url: null,
  is_email_verified: true,
  is_2fa_enabled: false,
};

function makeTargetProfile(overrides: Partial<PublicUserProfile> = {}): PublicUserProfile {
  return {
    id: 'u-target',
    username: 'fallen_br',
    display_name: 'FalleN',
    bio: 'Professor do CS2.',
    avatar_url: null,
    discord_linked: true,
    discord_username: 'fallen_disc',
    friendship_status: 'none',
    friendship_id: null,
    stats: {
      clips_count: 0,
      total_views: 120,
      total_likes: 34,
      collections_count: 1,
    },
    created_at: '2026-11-21T22:00:00Z',
    ...overrides,
  };
}

function renderProfile() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <PublicProfileView username="fallen_br" />
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('PublicProfileView dynamic friendship button (/u/[username])', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    vi.spyOn(userService, 'listUserClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  function mockAuthenticatedBoot() {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'profile_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(CURRENT_USER), { status: 200 }));
  }

  it('shows ENTRAR PARA ADICIONAR CTA linking to /login for anonymous visitors', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    vi.spyOn(userService, 'getPublicProfile').mockResolvedValueOnce(
      makeTargetProfile({ friendship_status: 'none' }),
    );

    renderProfile();

    await waitFor(() => {
      expect(screen.getByTestId('friendship-login-cta')).toBeInTheDocument();
    });

    expect(screen.getByTestId('friendship-login-cta')).toHaveAttribute(
      'href',
      '/login?redirect=%2Fu%2Ffallen_br',
    );
    expect(screen.getByRole('button', { name: 'ENTRAR PARA ADICIONAR' })).toBeInTheDocument();
  });

  it('supports adding friend (none -> pending_sent) and cancelling the sent request (pending_sent -> none)', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot();

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValueOnce(
      makeTargetProfile({ friendship_status: 'none', friendship_id: null }),
    );

    const sendSpy = vi.spyOn(friendsService, 'sendRequest').mockResolvedValueOnce({
      friendship_id: 'f-100',
      status: 'pending',
      auto_accepted: false,
      message: 'Pedido de amizade enviado com sucesso.',
      user: {
        id: 'u-target',
        username: 'fallen_br',
        display_name: 'FalleN',
        avatar_url: null,
      },
    });
    const removeSpy = vi.spyOn(friendsService, 'removeFriendship').mockResolvedValueOnce(undefined);

    renderProfile();

    const addBtn = await screen.findByRole('button', { name: '+ ADICIONAR AMIGO' });
    await user.click(addBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith('u-target');
    });

    const pendingBtn = await screen.findByRole('button', { name: 'PEDIDO ENVIADO' });
    expect(screen.getByText('Pedido de amizade enviado com sucesso.')).toBeInTheDocument();

    // Open menu and cancel sent request
    await user.click(pendingBtn);
    await user.click(screen.getByRole('menuitem', { name: 'Cancelar pedido' }));

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('f-100');
    });
    expect(await screen.findByRole('button', { name: '+ ADICIONAR AMIGO' })).toBeInTheDocument();
    expect(screen.getByText('Pedido de amizade cancelado.')).toBeInTheDocument();
  });

  it('supports accepting pending_received request and then unfriending with confirmation dialog', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot();

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValueOnce(
      makeTargetProfile({ friendship_status: 'pending_received', friendship_id: 'f-200' }),
    );

    const acceptSpy = vi.spyOn(friendsService, 'acceptRequest').mockResolvedValueOnce({
      friendship_id: 'f-200',
      status: 'accepted',
      message: 'Pedido de amizade aceito com sucesso.',
      user: {
        id: 'u-target',
        username: 'fallen_br',
        display_name: 'FalleN',
        avatar_url: null,
      },
    });
    const removeSpy = vi.spyOn(friendsService, 'removeFriendship').mockResolvedValueOnce(undefined);

    renderProfile();

    const acceptBtn = await screen.findByRole('button', { name: 'ACEITAR' });
    expect(screen.getByRole('button', { name: 'RECUSAR' })).toBeInTheDocument();

    await user.click(acceptBtn);

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith('f-200');
    });

    const friendsBtn = await screen.findByTestId('friendship-accepted-btn');
    expect(friendsBtn).toHaveTextContent('AMIGOS ✓');

    // Open dropdown and click Desfazer amizade
    await user.click(friendsBtn);
    await user.click(screen.getByRole('menuitem', { name: 'Desfazer amizade' }));

    expect(screen.getByRole('heading', { name: 'DESFAZER AMIZADE?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'DESFAZER AMIZADE' }));

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('f-200');
    });
    expect(await screen.findByRole('button', { name: '+ ADICIONAR AMIGO' })).toBeInTheDocument();
  });

  it('supports declining a pending_received request', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot();

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValueOnce(
      makeTargetProfile({ friendship_status: 'pending_received', friendship_id: 'f-300' }),
    );
    const removeSpy = vi.spyOn(friendsService, 'removeFriendship').mockResolvedValueOnce(undefined);

    renderProfile();

    const declineBtn = await screen.findByRole('button', { name: 'RECUSAR' });
    await user.click(declineBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('f-300');
    });
    expect(await screen.findByRole('button', { name: '+ ADICIONAR AMIGO' })).toBeInTheDocument();
    expect(screen.getByText('Pedido de amizade recusado.')).toBeInTheDocument();
  });
});
