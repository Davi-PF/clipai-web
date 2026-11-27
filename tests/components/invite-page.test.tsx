import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMetadata } from '@/app/invite/[code]/page';
import { DiscordCallbackContent } from '@/components/auth/DiscordCallbackContent';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { InviteLandingView } from '@/components/invites/InviteLandingView';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ApiClientError, clearAccessToken } from '@/lib/api-client';
import { getPendingInviteCode, savePendingInviteCode } from '@/lib/pending-invite';
import { authService } from '@/services/auth-service';
import { invitesService } from '@/services/invites-service';
import type { User } from '@/types/api';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

const LOGGED_USER: User = {
  id: 'u-visitor',
  username: 'coldzera_br',
  email: 'cold@clipai.com.br',
  display_name: 'Marcelo David',
  avatar_url: null,
  is_email_verified: true,
  is_2fa_enabled: false,
};

function renderWithAuth(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      <AuthProvider>
        {ui}
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('Invite Page (/invite/[code]), OpenGraph Metadata & Auto-Accept Flows', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    pushMock.mockReset();
    replaceMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('generates OpenGraph metadata in PT-BR for valid invites and fallback for 404', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          invite_code: 'xK9mP2',
          username: 'fallen_br',
          display_name: 'FalleN',
          avatar_url: 'https://cdn.clipai.com.br/avatars/fallen.webp',
          discord_username: 'fallen_disc',
        }),
        { status: 200 },
      ),
    );

    const validMeta = await generateMetadata({ params: Promise.resolve({ code: 'xK9mP2' }) });
    expect(validMeta.title).toBe('Convite de FalleN para o CLIPAÍ');
    expect(validMeta.description).toBe(
      'Entre pelo convite para virar amigo automaticamente e assistir clipes exclusivos da call.',
    );
    expect(validMeta.openGraph?.title).toBe('Convite de FalleN para o CLIPAÍ');
    expect(validMeta.openGraph?.locale).toBe('pt_BR');

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 404 }));
    const fallbackMeta = await generateMetadata({
      params: Promise.resolve({ code: 'invalid_code' }),
    });
    expect(fallbackMeta.title).toBe('Convite para o CLIPAÍ');
  });

  it('allows logged-in users to accept an invite and redirects to /u/[username] with green toast', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'invite_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(LOGGED_USER), { status: 200 }));

    vi.spyOn(invitesService, 'getInvitePreview').mockResolvedValueOnce({
      invite_code: 'xK9mP2',
      username: 'fallen_br',
      display_name: 'FalleN',
      avatar_url: null,
      discord_username: 'fallen_disc',
    });

    const acceptSpy = vi.spyOn(invitesService, 'acceptInvite').mockResolvedValueOnce({
      friendship_id: 'f-10',
      status: 'accepted',
      already_friends: false,
      message: 'Convite aceito! Vocês agora são amigos.',
      inviter: {
        id: 'u-fallen',
        username: 'fallen_br',
        display_name: 'FalleN',
        avatar_url: null,
      },
    });

    renderWithAuth(<InviteLandingView code="xK9mP2" />);

    const acceptBtn = await screen.findByRole('button', {
      name: 'ACEITAR CONVITE E VIRAR AMIGO',
    });
    await user.click(acceptBtn);

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith('xK9mP2');
    });
    expect(screen.getByText('Convite aceito! Vocês agora são amigos.')).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith('/u/fallen_br');
  });

  it('saves invite_code in sessionStorage and shows anonymous CTAs for unauthenticated visitors', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    vi.spyOn(invitesService, 'getInvitePreview').mockResolvedValueOnce({
      invite_code: 'anonCode99',
      username: 'fallen_br',
      display_name: 'FalleN',
      avatar_url: null,
      discord_username: 'fallen_disc',
    });

    renderWithAuth(<InviteLandingView code="anonCode99" />);

    await waitFor(() => {
      expect(screen.getByTestId('invite-anonymous-actions')).toBeInTheDocument();
    });

    expect(getPendingInviteCode()).toBe('anonCode99');
    expect(
      screen.getByRole('button', { name: 'CRIAR CONTA E ACEITAR' }).closest('a'),
    ).toHaveAttribute('href', '/register?invite=anonCode99');
    expect(screen.getByRole('button', { name: 'ENTRAR COM DISCORD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JÁ TENHO CONTA' }).closest('a')).toHaveAttribute(
      'href',
      '/login?invite=anonCode99',
    );
  });

  it('handles 404 invalid invite codes cleanly', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    vi.spyOn(invitesService, 'getInvitePreview').mockRejectedValueOnce(
      new ApiClientError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: 'Convite não encontrado.',
      }),
    );

    renderWithAuth(<InviteLandingView code="ghost-code" />);

    await waitFor(() => {
      expect(screen.getByTestId('invite-not-found')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'CONVITE INVÁLIDO OU EXPIRADO' }),
    ).toBeInTheDocument();
  });

  it('automatically accepts pending invite code upon completing /login, /register and /auth/discord/callback', async () => {
    const user = userEvent.setup();

    // 1. /login with ?invite=loginInvite1
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    window.history.replaceState(null, '', '/login?invite=loginInvite1');

    vi.spyOn(authService, 'login').mockResolvedValueOnce({
      access_token: 'jwt_login',
      token_type: 'bearer',
      expires_in: 900,
      requires_2fa: false,
      temp_2fa_token: null,
      user: LOGGED_USER,
    });

    const acceptInviteSpy = vi.spyOn(invitesService, 'acceptInvite').mockResolvedValue({
      friendship_id: 'f-auto',
      status: 'accepted',
      already_friends: false,
      message: 'Convite aceito! Vocês agora são amigos.',
      inviter: {
        id: 'u-fallen',
        username: 'fallen_br',
        display_name: 'FalleN',
        avatar_url: null,
      },
    });

    const { unmount: unmountLogin } = renderWithAuth(<LoginForm />);
    expect(await screen.findByTestId('login-invite-banner')).toBeInTheDocument();

    await user.type(screen.getByLabelText('E-mail'), 'cold@clipai.com.br');
    await user.type(screen.getByLabelText('Senha'), 'StrongPass!1');
    await user.click(screen.getByRole('button', { name: 'ENTRAR' }));

    await waitFor(() => {
      expect(acceptInviteSpy).toHaveBeenCalledWith('loginInvite1');
    });
    expect(getPendingInviteCode()).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    unmountLogin();

    // 2. /register with ?invite=regInvite2
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    window.history.replaceState(null, '', '/register?invite=regInvite2');
    const registerSpy = vi.spyOn(authService, 'register').mockResolvedValueOnce({
      message: 'Cadastro realizado com sucesso.',
      user: LOGGED_USER,
    });

    const { unmount: unmountRegister } = renderWithAuth(<RegisterForm />);
    expect(await screen.findByTestId('register-invite-banner')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome de usuário (username)'), 'coldzera_br');
    await user.type(screen.getByLabelText('Nome de exibição'), 'Marcelo David');
    await user.type(screen.getByLabelText('E-mail'), 'cold@clipai.com.br');
    await user.type(screen.getByLabelText('Senha'), 'StrongPass!1');
    await user.type(screen.getByLabelText('Confirmar senha'), 'StrongPass!1');
    await user.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'coldzera_br',
          invite_code: 'regInvite2',
        }),
      );
    });
    expect(getPendingInviteCode()).toBeNull();
    unmountRegister();

    // 3. /auth/discord/callback with pending invite in sessionStorage
    window.history.replaceState(null, '', '/auth/discord/callback');
    savePendingInviteCode('discordInvite3');
    currentSearchParams = new URLSearchParams('code=disc_code&state=disc_state');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    acceptInviteSpy.mockClear();

    vi.spyOn(authService, 'handleDiscordCallback').mockResolvedValueOnce({
      access_token: 'jwt_discord',
      token_type: 'bearer',
      expires_in: 900,
      requires_2fa: false,
      temp_2fa_token: null,
      mode: 'login',
      linked: true,
      message: 'Login com Discord realizado!',
      user: LOGGED_USER,
    });

    renderWithAuth(<DiscordCallbackContent />);

    await waitFor(() => {
      expect(acceptInviteSpy).toHaveBeenCalledWith('discordInvite3');
    });
    expect(getPendingInviteCode()).toBeNull();
  });
});
