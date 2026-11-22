import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ToastViewport } from '@/components/ui/Toast';
import { clearAccessToken, getAccessToken } from '@/lib/api-client';
import { authService } from '@/services/auth-service';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
  }),
}));

function AuthHarness() {
  const { user, isAuthenticated, isLoading, login, logout, refreshSession } = useAuth();

  return (
    <div>
      <span data-testid="auth-loading">{String(isLoading)}</span>
      <span data-testid="auth-status">{String(isAuthenticated)}</span>
      <span data-testid="auth-username">{user?.username ?? 'anon'}</span>
      <button
        type="button"
        onClick={() =>
          void login({ email: 'fallen@clipai.com.br', password: 'StrongPassword!2026' })
        }
      >
        Do Login
      </button>
      <button type="button" onClick={() => void logout()}>
        Do Logout
      </button>
      <button type="button" onClick={() => void refreshSession()}>
        Do Refresh
      </button>
    </div>
  );
}

describe('AuthProvider & useAuth', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    replaceMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('restores session silently on mount via /auth/refresh and /users/me', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'restored_jwt',
            token_type: 'bearer',
            expires_in: 900,
          }),
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

    render(
      <ToastProvider>
        <AuthProvider>
          <AuthHarness />
        </AuthProvider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
    expect(screen.getByTestId('auth-username')).toHaveTextContent('fallen_br');
    expect(getAccessToken()).toBe('restored_jwt');
  });

  it('handles guest mode when silent refresh returns 401 and supports login/logout', async () => {
    const userEv = userEvent.setup();

    fetchMock
      // Initial silent refresh fails (no cookie)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INVALID_TOKEN', message: 'Inválido' } }), {
          status: 401,
        }),
      )
      // Login succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'login_jwt',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            user: {
              id: 'u2',
              username: 'coldzera',
              email: 'cold@clipai.com.br',
              display_name: 'Marcelo David',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: false,
            },
          }),
          { status: 200 },
        ),
      )
      // Logout succeeds
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <ToastProvider>
        <AuthProvider>
          <AuthHarness />
        </AuthProvider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
    expect(replaceMock).not.toHaveBeenCalled();

    await userEv.click(screen.getByRole('button', { name: 'Do Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('auth-username')).toHaveTextContent('coldzera');

    await userEv.click(screen.getByRole('button', { name: 'Do Logout' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
    });
    expect(getAccessToken()).toBeNull();
  });

  it('redirects to /login and clears session when a subsequent 401 fails refresh', async () => {
    fetchMock
      // Initial silent refresh + /users/me succeed
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'initial_jwt', token_type: 'bearer', expires_in: 900 }),
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
      )
      // Subsequent protected call returns 401 TOKEN_EXPIRED
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Sua sessão expirou. Faça login novamente.',
              request_id: 'req_1',
            },
          }),
          { status: 401 },
        ),
      )
      // Refresh fails
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_TOKEN',
              message: 'Revogado',
              request_id: 'req_2',
            },
          }),
          { status: 401 },
        ),
      );

    render(
      <ToastProvider>
        <AuthProvider>
          <AuthHarness />
          <ToastViewport />
        </AuthProvider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
    });

    await act(async () => {
      await expect(authService.getCurrentUser()).rejects.toMatchObject({ status: 401 });
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
    });
    expect(replaceMock).toHaveBeenCalledWith('/login');
    expect(screen.getByText('Sua sessão expirou. Faça login novamente.')).toBeInTheDocument();
  });
});
