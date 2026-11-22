import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DiscordCallbackPage from '@/app/auth/discord/callback/page';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { clearAccessToken } from '@/lib/api-client';

const replaceMock = vi.fn();
const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      <AuthProvider>
        {ui}
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('Discord OAuth2 & 2FA Challenge Flows', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    replaceMock.mockReset();
    pushMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('renders ENTRAR COM DISCORD on /login and /register with divider and transitions /login to 2FA step', async () => {
    const user = userEvent.setup();

    fetchMock
      // Initial AuthProvider silent refresh fails (guest)
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      // Login returns requires_2fa: true
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: null,
            token_type: 'bearer',
            expires_in: 300,
            requires_2fa: true,
            challenge_token: 'challenge_jwt_abc',
            temp_2fa_token: 'challenge_jwt_abc',
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: true,
            },
          }),
          { status: 200 },
        ),
      )
      // 2FA verification succeeds with backup code
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'final_2fa_jwt',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: true,
            },
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(<LoginForm />);

    expect(screen.getByText('ou continue com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ENTRAR COM DISCORD' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('E-mail'), 'gabriel@clipai.com.br');
    await user.type(screen.getByLabelText('Senha'), 'StrongPassword!2026');
    await user.click(screen.getByRole('button', { name: 'ENTRAR' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'VERIFICAÇÃO EM 2 ETAPAS (2FA)' }),
      ).toBeInTheDocument();
    });

    // Validate 6-digit requirement first
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123');
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR VERIFICAÇÃO' }));
    expect(
      screen.getByText('Informe o código numérico de 6 dígitos do seu autenticador.'),
    ).toBeInTheDocument();

    // Switch to backup code mode
    await user.click(screen.getByRole('button', { name: 'Usar código de backup' }));
    await user.type(screen.getByLabelText('Código de backup'), '7k4m-9p2x');
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR VERIFICAÇÃO' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders ENTRAR COM DISCORD on /register and handles Discord OAuth button click', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'DISCORD_OAUTH_FAILED',
              message: 'Serviço do Discord temporariamente indisponível.',
              request_id: 'req_disc_err',
            },
          }),
          { status: 400 },
        ),
      );

    renderWithProviders(<RegisterForm />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('ou continue com')).toBeInTheDocument();
    const discordBtn = screen.getByRole('button', { name: 'ENTRAR COM DISCORD' });
    expect(discordBtn).toBeInTheDocument();

    await user.click(discordBtn);
    await waitFor(() => {
      expect(
        screen.getAllByText('Serviço do Discord temporariamente indisponível.').length,
      ).toBeGreaterThan(0);
    });
  });

  it('handles /auth/discord/callback for login mode -> /dashboard', async () => {
    currentSearchParams = new URLSearchParams('code=discord_code_1&state=signed_state_1');

    fetchMock
      // Initial silent refresh fails (guest logging in via Discord)
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      // POST /api/v1/auth/discord/callback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'discord_login_jwt',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            mode: 'login',
            linked: true,
            message: 'Login com Discord realizado com sucesso!',
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: 'https://cdn.discordapp.com/avatars/1/a.png',
              discord_linked: true,
              discord_username: 'fallen_disc',
              is_email_verified: true,
              is_2fa_enabled: false,
            },
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(<DiscordCallbackPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.getByText('Login com Discord realizado com sucesso!')).toBeInTheDocument();
  });

  it('handles /auth/discord/callback for link mode -> /settings?tab=connections with green toast', async () => {
    currentSearchParams = new URLSearchParams('code=discord_code_link&state=signed_state_link');

    fetchMock
      // Authenticated session restored
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'active_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: null,
            discord_linked: false,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      // POST /api/v1/auth/discord/callback (mode=link)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: null,
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            mode: 'link',
            linked: true,
            message: 'Conta do Discord vinculada com sucesso!',
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: 'https://cdn.discordapp.com/avatars/1/a.png',
              discord_linked: true,
              discord_username: 'fallen_disc',
              is_email_verified: true,
              is_2fa_enabled: false,
            },
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(<DiscordCallbackPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/settings?tab=connections');
    });
    expect(screen.getByText('Conta do Discord vinculada com sucesso!')).toBeInTheDocument();
  });

  it('handles /auth/discord/callback when requires_2fa is true and when user cancels on Discord', async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams('code=discord_2fa_code&state=state_2fa');

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: null,
            token_type: 'bearer',
            expires_in: 300,
            requires_2fa: true,
            challenge_token: 'discord_challenge_tok',
            temp_2fa_token: 'discord_challenge_tok',
            mode: 'login',
            linked: true,
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: true,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'verified_jwt',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: true,
            },
          }),
          { status: 200 },
        ),
      );

    const { unmount } = renderWithProviders(<DiscordCallbackPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'VERIFICAÇÃO EM 2 ETAPAS (2FA)' }),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Código de 6 dígitos'), '482910');
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR VERIFICAÇÃO' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
    unmount();

    // Test user cancellation on Discord (?error=access_denied)
    currentSearchParams = new URLSearchParams('error=access_denied');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    renderWithProviders(<DiscordCallbackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('discord-callback-error')).toHaveTextContent(
        'Autorização com o Discord cancelada pelo usuário.',
      );
    });
  });
});
