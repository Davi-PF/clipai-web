import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudioPage from '@/app/studio/page';
import { AppProviders } from '@/components/providers/AppProviders';
import { ITEMS_PER_PAGE, resolveStudioClipsPage } from '@/components/studio/CreatorStudioWorkspace';
import { clearAccessToken } from '@/lib/api-client';
import { analyticsService } from '@/services/analytics-service';
import { clipsService } from '@/services/clips-service';
import type {
  AnalyticsOverviewResponse,
  ClipRetentionResponse,
  CreatorClipAnalyticsItem,
} from '@/types/analytics';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="recharts-area-chart">{children}</div>
  ),
  Area: () => <div data-testid="recharts-area" />,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

const MOCK_OVERVIEW: AnalyticsOverviewResponse = {
  period: '30d',
  total_clips: 2,
  total_views: 1840,
  total_likes: 310,
  total_favorites: 74,
  total_watch_time_seconds: 14_250,
  avg_retention_pct: 74.2,
  completion_rate_pct: 58.5,
  total_sessions: 410,
  views_by_day: [
    { date: '2026-11-21', sessions: 12, watch_time_seconds: 320 },
    { date: '2026-11-22', sessions: 24, watch_time_seconds: 612 },
  ],
  by_game: [
    {
      game_id: 'g-cs2',
      game_name: 'CS2',
      clips_count: 2,
      total_views: 1840,
      avg_retention_pct: 74.2,
    },
  ],
  top_clips: [
    {
      id: 'clip-1',
      slug: 'clutch-mirage',
      title: 'Clutch 1v4 de AWP na Mirage',
      thumbnail_url: 'https://cdn.clipai.com.br/thumb1.webp',
      game_name: 'CS2',
      views_count: 1200,
      likes_count: 210,
      avg_retention_pct: 81.5,
      completion_rate_pct: 68.0,
    },
  ],
};

const MOCK_CLIPS: CreatorClipAnalyticsItem[] = [
  {
    id: 'clip-1',
    slug: 'clutch-mirage',
    title: 'Clutch 1v4 de AWP na Mirage',
    privacy: 'public',
    status: 'ready',
    thumbnail_url: 'https://cdn.clipai.com.br/thumb1.webp',
    duration_seconds: 34.5,
    game_id: 'g-cs2',
    game_name: 'CS2',
    views_count: 1200,
    likes_count: 210,
    favorites_count: 45,
    sessions_count: 220,
    avg_retention_pct: 81.5,
    completion_rate_pct: 68.0,
    created_at: '2026-11-21T22:05:00Z',
  },
  {
    id: 'clip-2',
    slug: 'ace-ascent',
    title: 'Ace de Vandal na Ascent',
    privacy: 'unlisted',
    status: 'ready',
    thumbnail_url: 'https://cdn.clipai.com.br/thumb2.webp',
    duration_seconds: 26,
    game_id: 'g-val',
    game_name: 'Valorant',
    views_count: 640,
    likes_count: 100,
    favorites_count: 29,
    sessions_count: 190,
    avg_retention_pct: 48.0,
    completion_rate_pct: 42.0,
    created_at: '2026-11-22T10:00:00Z',
  },
];

const RETENTION_CLIP_1: ClipRetentionResponse = {
  clip_id: 'clip-1',
  slug: 'clutch-mirage',
  title: 'Clutch 1v4 de AWP na Mirage',
  duration_seconds: 34.5,
  period: '30d',
  total_sessions: 40,
  avg_watch_seconds: 25.0,
  avg_retention_pct: 81.5,
  completion_rate_pct: 68.0,
  biggest_drop_bucket_pct: 40,
  views_by_day: [{ date: '2026-11-22', sessions: 12, watch_time_seconds: 298 }],
  curve: [
    { bucket_pct: 0, retention_pct: 100, sessions: 40 },
    { bucket_pct: 40, retention_pct: 65, sessions: 26 },
    { bucket_pct: 100, retention_pct: 55, sessions: 22 },
  ],
};

const RETENTION_CLIP_2: ClipRetentionResponse = {
  clip_id: 'clip-2',
  slug: 'ace-ascent',
  title: 'Ace de Vandal na Ascent',
  duration_seconds: 26,
  period: '30d',
  total_sessions: 30,
  avg_watch_seconds: 14.0,
  avg_retention_pct: 48.0,
  completion_rate_pct: 42.0,
  biggest_drop_bucket_pct: 30,
  views_by_day: [{ date: '2026-11-22', sessions: 10, watch_time_seconds: 140 }],
  curve: [
    { bucket_pct: 0, retention_pct: 100, sessions: 30 },
    { bucket_pct: 30, retention_pct: 50, sessions: 15 },
    { bucket_pct: 100, retention_pct: 40, sessions: 12 },
  ],
};

describe('CreatorStudioWorkspace (/studio)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    pushMock.mockReset();
    replaceMock.mockReset();

    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({ access_token: 'studio_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        );
      }
      if (url.endsWith('/users/me')) {
        return new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('renders KPIs, period switcher, retention curve switching, filters and copy/delete actions', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const overviewSpy = vi.spyOn(analyticsService, 'getOverview').mockResolvedValue(MOCK_OVERVIEW);
    const listClipsSpy = vi.spyOn(analyticsService, 'listCreatorClips').mockResolvedValue({
      items: MOCK_CLIPS,
      page: 1,
      page_size: 5,
      total: 2,
      total_pages: 1,
    });
    const retentionSpy = vi
      .spyOn(analyticsService, 'getClipRetention')
      .mockImplementation(async (clipId) =>
        clipId === 'clip-2' ? RETENTION_CLIP_2 : RETENTION_CLIP_1,
      );
    const deleteSpy = vi.spyOn(clipsService, 'deleteClip').mockResolvedValue(undefined);

    render(
      <AppProviders>
        <StudioPage />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ESTÚDIO DO CRIADOR' })).toBeInTheDocument();
    });

    // KPI values & retention semantic tone (>= 60% -> high)
    await waitFor(() => {
      expect(screen.getByTestId('kpi-avg-retention-value')).toHaveTextContent('74.2%');
    });
    expect(screen.getByTestId('kpi-avg-retention-value')).toHaveAttribute('data-tone', 'high');
    expect(screen.getByTestId('kpi-engagement-watchtime')).toHaveTextContent('3h 57m');

    // Default selected clip #1 retention curve and biggest drop insight
    await waitFor(() => {
      expect(screen.getByTestId('retention-biggest-drop-badge')).toHaveTextContent(
        'Maior queda nos 40%',
      );
    });
    expect(screen.getByTestId('retention-selected-clip-title')).toHaveTextContent(
      'Clutch 1v4 de AWP na Mirage',
    );

    // Click "Ver Retenção" on clip-2 -> updates retention curve dynamically
    await user.click(
      screen.getByRole('button', { name: 'Ver retenção de Ace de Vandal na Ascent' }),
    );
    await waitFor(() => {
      expect(retentionSpy).toHaveBeenCalledWith('clip-2', '30d');
    });
    expect(screen.getByTestId('retention-biggest-drop-badge')).toHaveTextContent(
      'Maior queda nos 30%',
    );

    // Switch period to 7D
    await user.click(screen.getByRole('button', { name: '7D' }));
    await waitFor(() => {
      expect(overviewSpy).toHaveBeenCalledWith('7d');
    });

    // Privacy filter & sort selector
    await user.selectOptions(screen.getByLabelText('Filtrar por privacidade'), 'unlisted');
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ privacy: 'unlisted' }));
    });

    await user.selectOptions(screen.getByLabelText('Ordenar clipes'), 'retention');
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ sort: 'retention' }));
    });

    // Copy link
    await user.click(
      screen.getByRole('button', { name: 'Copiar link de Ace de Vandal na Ascent' }),
    );
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/c/ace-ascent'));

    // Delete clip confirmation modal
    await user.click(screen.getByRole('button', { name: 'Excluir Ace de Vandal na Ascent' }));
    expect(
      screen.getByRole('heading', { name: 'EXCLUIR CLIPE PERMANENTEMENTE?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR EXCLUSÃO' }));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('clip-2');
    });
  });

  it('renders friendly empty states when creator has no clips or retention sessions yet', async () => {
    vi.spyOn(analyticsService, 'getOverview').mockResolvedValue({
      ...MOCK_OVERVIEW,
      total_clips: 0,
      total_views: 0,
      total_likes: 0,
      total_favorites: 0,
      total_watch_time_seconds: 0,
      avg_retention_pct: 0,
      completion_rate_pct: 0,
      total_sessions: 0,
      views_by_day: [{ date: '2026-11-22', sessions: 0, watch_time_seconds: 0 }],
      top_clips: [],
    });
    vi.spyOn(analyticsService, 'listCreatorClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 10,
      total: 0,
      total_pages: 1,
    });

    render(
      <AppProviders>
        <StudioPage />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('studio-clips-empty')).toBeInTheDocument();
    });

    expect(screen.getByTestId('views-chart-empty')).toBeInTheDocument();
    expect(screen.getByTestId('retention-chart-empty')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-avg-retention-value')).toHaveAttribute('data-tone', 'low');
  });

  it('locks desktop layout shell for fixed sidebar with internal main scroll and paginates clips 5 per page resetting on filter/sort/search', async () => {
    const user = userEvent.setup();
    const sevenClips: CreatorClipAnalyticsItem[] = Array.from({ length: 7 }, (_, index) => ({
      ...MOCK_CLIPS[0]!,
      id: `clip-${index + 1}`,
      slug: `clip-slug-${index + 1}`,
      title: `Jogada Destaque #${index + 1}`,
      views_count: 500 - index * 20,
    }));

    vi.spyOn(analyticsService, 'getOverview').mockResolvedValue(MOCK_OVERVIEW);
    vi.spyOn(analyticsService, 'getClipRetention').mockResolvedValue(RETENTION_CLIP_1);
    const listClipsSpy = vi
      .spyOn(analyticsService, 'listCreatorClips')
      .mockImplementation(async (params = {}) => {
        const currentPage = params.page ?? 1;
        const pageSize = params.page_size ?? 5;
        const start = (currentPage - 1) * pageSize;
        return {
          items: sevenClips.slice(start, start + pageSize),
          page: currentPage,
          page_size: pageSize,
          total: sevenClips.length,
          total_pages: Math.ceil(sevenClips.length / pageSize),
        };
      });

    render(
      <AppProviders>
        <StudioPage />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('studio-clip-row-clip-1')).toBeInTheDocument();
    });

    // 1. Desktop shell fixes sidebar (md:h-dvh md:overflow-hidden) and main content scrolls internally
    expect(screen.getByTestId('studio-layout-shell')).toHaveClass(
      'md:h-dvh',
      'md:overflow-hidden',
      'md:flex-row',
    );
    expect(screen.getByTestId('studio-main-content')).toHaveClass(
      'flex-1',
      'min-h-0',
      'overflow-y-auto',
    );

    // 2. Requests 5 items per page and renders exactly 5 rows on page 1
    expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 1, page_size: 5 }));
    expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 1 de 2');
    expect(screen.getByTestId('studio-clip-row-clip-5')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-clip-row-clip-6')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior do estúdio' })).toBeDisabled();

    // Navigate to page 2 -> displays clips 6 and 7
    await user.click(screen.getByRole('button', { name: 'Próxima página do estúdio' }));
    await waitFor(() => {
      expect(screen.getByTestId('studio-clip-row-clip-6')).toBeInTheDocument();
    });
    expect(screen.getByTestId('studio-clip-row-clip-7')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-clip-row-clip-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 2 de 2');
    expect(screen.getByRole('button', { name: 'Próxima página do estúdio' })).toBeDisabled();

    // Changing privacy filter resets back to page 1
    await user.selectOptions(screen.getByLabelText('Filtrar por privacidade'), 'public');
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ privacy: 'public', page: 1, page_size: 5 }),
      );
    });
    expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 1 de 2');

    // Go to page 2 again, then change sort -> resets back to page 1
    await user.click(screen.getByRole('button', { name: 'Próxima página do estúdio' }));
    await waitFor(() => {
      expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 2 de 2');
    });
    await user.selectOptions(screen.getByLabelText('Ordenar clipes'), 'likes');
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'likes', page: 1, page_size: 5 }),
      );
    });
    expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 1 de 2');

    // Go to page 2 again, then search -> resets back to page 1 after debounce
    await user.click(screen.getByRole('button', { name: 'Próxima página do estúdio' }));
    await waitFor(() => {
      expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 2 de 2');
    });
    await user.type(screen.getByLabelText('Buscar clipe no estúdio'), 'Jogada');
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'Jogada', page: 1, page_size: 5 }),
      );
    });
    expect(screen.getByTestId('studio-clips-pagination')).toHaveTextContent('Página 1 de 2');
  });

  it('resolveStudioClipsPage caps overflowing payloads to ITEMS_PER_PAGE (5) and clamps out-of-range pages', () => {
    const eightClips: CreatorClipAnalyticsItem[] = Array.from({ length: 8 }, (_, index) => ({
      ...MOCK_CLIPS[0]!,
      id: `overflow-${index + 1}`,
      title: `Clipe ${index + 1}`,
    }));

    const page1 = resolveStudioClipsPage({
      rawItems: eightClips,
      apiTotalPages: 1,
      page: 1,
    });
    expect(ITEMS_PER_PAGE).toBe(5);
    expect(page1.items.map((item) => item.id)).toEqual([
      'overflow-1',
      'overflow-2',
      'overflow-3',
      'overflow-4',
      'overflow-5',
    ]);
    expect(page1.totalPages).toBe(2);
    expect(page1.safePage).toBe(1);

    const clampedPage = resolveStudioClipsPage({
      rawItems: eightClips,
      apiTotalPages: 1,
      page: 99,
    });
    expect(clampedPage.safePage).toBe(2);
    expect(clampedPage.items.map((item) => item.id)).toEqual([
      'overflow-6',
      'overflow-7',
      'overflow-8',
    ]);
  });
});
