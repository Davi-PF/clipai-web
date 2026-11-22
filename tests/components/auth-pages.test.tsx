import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProvisionalDashboardPage from '@/app/dashboard/page';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { GuestGuard } from '@/components/auth/GuestGuard';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { VerifyEmailContent } from '@/components/auth/VerifyEmailContent';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { clearAccessToken } from '@/lib/api-client';

const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

describe('Auth Pages & Route Guards', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    replaceMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('validates LoginForm client-side and submits valid credentials', async () => {
    const user = userEvent.setup();
    fetchMock
      // AuthProvider initial silent refresh fails (guest)
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      // Login succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'jwt_ok',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'Gabriel Toledo',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: false,
            },
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'ENTRAR' }));
    expect(screen.getByText('Informe um endereço de e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('E-mail'), 'gabriel@clipai.com.br');
    await user.type(screen.getByLabelText('Senha'), 'StrongPassword!2026');
    await user.click(screen.getByRole('button', { name: 'ENTRAR' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('validates RegisterForm and shows email verification screen with resend action', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Cadastro realizado com sucesso.',
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'Gabriel Toledo',
              avatar_url: null,
              is_email_verified: false,
              is_2fa_enabled: false,
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Um novo link de confirmação foi enviado.',
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(<RegisterForm />);

    await user.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));
    expect(
      screen.getByText('Use de 3 a 30 caracteres (apenas letras, números e sublinhado).'),
    ).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome de usuário (username)'), 'fallen_br');
    await user.type(screen.getByLabelText('Nome de exibição'), 'Gabriel Toledo');
    await user.type(screen.getByLabelText('E-mail'), 'gabriel@clipai.com.br');
    await user.type(screen.getByLabelText('Senha'), 'StrongPassword!2026');
    await user.type(screen.getByLabelText('Confirmar senha'), 'StrongPassword!2026');
    await user.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CONFIRME SEU E-MAIL' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail de verificação' }));
    await waitFor(() => {
      expect(screen.getByText('Um novo link de confirmação foi enviado.')).toBeInTheDocument();
    });
  });

  it('handles VerifyEmailContent success and invalid token states', async () => {
    currentSearchParams = new URLSearchParams('token=valid_verify_token');
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/verify-email')) {
        return new Response(
          JSON.stringify({
            message: 'E-mail confirmado com sucesso. Sua conta está pronta para uso.',
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 401 });
    });

    renderWithProviders(<VerifyEmailContent />);

    await waitFor(() => {
      expect(
        screen.getByText('E-mail confirmado com sucesso. Sua conta está pronta para uso.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'IR PARA O LOGIN' })).toBeInTheDocument();
  });

  it('handles VerifyEmailContent error state when token is missing', async () => {
    currentSearchParams = new URLSearchParams('');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    renderWithProviders(<VerifyEmailContent />);

    await waitFor(() => {
      expect(
        screen.getByText('Token de verificação ausente ou inválido na URL.'),
      ).toBeInTheDocument();
    });
  });

  it('handles ForgotPasswordForm and ResetPasswordForm flows', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Enviamos as instruções para redefinir sua senha.',
          }),
          { status: 200 },
        ),
      );

    const { unmount } = renderWithProviders(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText('E-mail'), 'gabriel@clipai.com.br');
    await user.click(screen.getByRole('button', { name: 'ENVIAR LINK DE RECUPERAÇÃO' }));

    await waitFor(() => {
      expect(
        screen.getByText('Enviamos as instruções para redefinir sua senha.'),
      ).toBeInTheDocument();
    });
    unmount();

    currentSearchParams = new URLSearchParams('token=reset_tok_123');
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Sua senha foi redefinida com sucesso. Faça login com a nova senha.',
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(<ResetPasswordForm />);

    await user.type(screen.getByLabelText('Nova senha'), 'NewStrongPassword!2026');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NewStrongPassword!2026');
    await user.click(screen.getByRole('button', { name: 'REDEFINIR SENHA' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'SENHA REDEFINIDA' })).toBeInTheDocument();
    });
  });

  it('protects /dashboard from unauthenticated users and redirects logged-in users from GuestGuard', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    const { unmount } = renderWithProviders(
      <AuthGuard>
        <div>Conteúdo Protegido</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
    unmount();

    replaceMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'valid_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'Gabriel Toledo',
            avatar_url: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      );

    renderWithProviders(
      <GuestGuard>
        <div>Tela de Login</div>
      </GuestGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders ProvisionalDashboardPage with user info and functional SAIR button', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'valid_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'Gabriel Toledo',
            avatar_url: null,
            is_email_verified: false,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    renderWithProviders(<ProvisionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('@fallen_br')).toBeInTheDocument();
    });
    expect(screen.getByText('gabriel@clipai.com.br')).toBeInTheDocument();
    expect(screen.getByTestId('email-pending-badge')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'SAIR' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
  });
});
