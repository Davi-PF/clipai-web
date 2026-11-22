import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/app/dashboard/page';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { clearAccessToken } from '@/lib/api-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const GAMES = [
  { id: 'g-cs2', name: 'CS2', slug: 'cs2' },
  { id: 'g-val', name: 'Valorant', slug: 'valorant' },
];

const TAGS = [{ id: 't-clutch', name: 'clutch', slug: 'clutch' }];

const CLIPS = [
  {
    id: 'clip-1',
    slug: 'clutch-mirage',
    title: 'Clutch na Mirage',
    privacy: 'public' as const,
    video_url: 'https://cdn.clipai.com.br/v1.mp4',
    thumbnail_url: 'https://cdn.clipai.com.br/t1.webp',
    duration_seconds: 34,
    views_count: 120,
    likes_count: 15,
    favorites_count: 4,
    is_liked: false,
    is_favorited: false,
    is_liked_by_me: false,
    is_favorited_by_me: false,
    author: {
      id: 'u1',
      username: 'fallen_br',
      display_name: 'Gabriel Toledo',
      avatar_url: null,
    },
    game: GAMES[0]!,
    tags: ['clutch'],
    created_at: '2026-11-21T20:00:00Z',
  },
];

describe('DashboardPage — QuickFiltersCard & Debounced Search', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('filters clips via QuickFiltersCard 3x3 and clears active filters', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({ access_token: 'jwt_dash', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        );
      }
      if (url.endsWith('/users/me')) {
        return new Response(
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
        );
      }
      if (url.includes('/games')) {
        return new Response(
          JSON.stringify({ items: GAMES, page: 1, page_size: 20, total: 2, total_pages: 1 }),
          { status: 200 },
        );
      }
      if (url.includes('/tags')) {
        return new Response(JSON.stringify({ items: TAGS }), { status: 200 });
      }
      if (url.includes('/collections')) {
        return new Response(
          JSON.stringify({ items: [], page: 1, page_size: 12, total: 0, total_pages: 0 }),
          { status: 200 },
        );
      }
      if (url.includes('/clips')) {
        const hasEmptyFilter = url.includes('game_slug=valorant');
        return new Response(
          JSON.stringify({
            items: hasEmptyFilter ? [] : CLIPS,
            page: 1,
            page_size: 6,
            total: hasEmptyFilter ? 0 : 1,
            total_pages: hasEmptyFilter ? 0 : 1,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    render(
      <ToastProvider>
        <AuthProvider>
          <DashboardPage />
          <ToastViewport />
        </AuthProvider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Clutch na Mirage' })).toBeInTheDocument();
    });

    // Click Valorant cell in QuickFiltersCard
    await user.click(screen.getByRole('button', { name: 'Valorant' }));
    await waitFor(() => {
      expect(screen.getByText('NENHUM CLIPE ENCONTRADO')).toBeInTheDocument();
    });

    // Click LIMPAR to restore clips
    await user.click(screen.getByRole('button', { name: 'LIMPAR' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Clutch na Mirage' })).toBeInTheDocument();
    });
  });
});
