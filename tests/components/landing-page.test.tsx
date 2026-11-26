import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/page';
import { AppProviders } from '@/components/providers/AppProviders';
import { clearAccessToken } from '@/lib/api-client';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

describe('Public Landing Page (/)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('renders visitor Landing Page with Hero, interactive mockup, features, steps and zero diagnostic text', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    render(
      <AppProviders>
        <HomePage />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /SUAS MELHORES JOGADAS\. SALVAS EM SEGUNDOS\./i,
        }),
      ).toBeInTheDocument();
    });

    // Visitor navbar & hero CTAs (matching h-10 vertical alignment)
    const loginLink = screen.getByRole('link', { name: 'ENTRAR' });
    expect(loginLink).toHaveAttribute('href', '/login');
    expect(loginLink).toHaveClass('inline-flex', 'h-10', 'items-center', 'justify-center');
    const registerBtn = screen.getByRole('button', { name: 'CRIAR CONTA' });
    expect(registerBtn).toHaveClass('h-10', 'inline-flex', 'items-center', 'justify-center');
    expect(screen.getByRole('button', { name: 'COMEÇAR GRÁTIS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ENTRAR COM DISCORD' })).toBeInTheDocument();

    // Interactive Hero Mockup tab switching
    expect(screen.getByText('CLUTCH 1V4 DE AWP NA MIRAGE (OT)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Valorant • Ace' }));
    expect(screen.getByText('ACE DE VANDAL NO BOMBSITE A — ASCENT')).toBeInTheDocument();

    // Features & How it works sections
    expect(screen.getByText('UPLOAD DIRETO SEM GARGALO')).toBeInTheDocument();
    expect(screen.getByText('PRIVACIDADE NO SEU CONTROLE')).toBeInTheDocument();
    expect(screen.getByText('ESTÚDIO DE RETENÇÃO')).toBeInTheDocument();
    expect(screen.getByText('DISCORD + 2FA INTEGRADOS')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();

    // Ensure ZERO old diagnostic panel strings exist
    expect(screen.queryByText(/Oxford by Night/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SPRINT 0/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Painel de diagnóstico/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PALETA BASE — DARK MODE FRIO/i)).not.toBeInTheDocument();
  });

  it('renders authenticated navbar state with user avatar/name and ABRIR DASHBOARD without forced redirect', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'landing_jwt', token_type: 'bearer', expires_in: 900 }),
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
            avatar_url: 'https://cdn.clipai.com.br/avatars/u1.webp',
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      );

    render(
      <AppProviders>
        <HomePage />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('landing-nav-user')).toBeInTheDocument();
    });

    const userPill = screen.getByTestId('landing-nav-user');
    expect(userPill).toHaveAttribute('href', '/settings');
    expect(userPill).toHaveAttribute('title', 'fallen_br');
    expect(userPill).toHaveAttribute('aria-label', 'Abrir configurações da conta (fallen_br)');
    expect(userPill).toHaveClass(
      'inline-flex',
      'h-10',
      'w-10',
      'items-center',
      'justify-center',
      'rounded-full',
      'border-border-muted',
      'hover:border-success',
    );
    expect(userPill).not.toHaveTextContent('FalleN');
    expect(screen.getByAltText('Avatar de FalleN')).toBeInTheDocument();

    const dashboardButtons = screen.getAllByRole('button', { name: 'ABRIR DASHBOARD' });
    expect(dashboardButtons.length).toBeGreaterThan(0);
    expect(dashboardButtons[0]).toHaveClass(
      'h-10',
      'inline-flex',
      'items-center',
      'justify-center',
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
