import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/app/dashboard/page';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ApiClientError, clearAccessToken } from '@/lib/api-client';
import { clipsService } from '@/services/clips-service';
import { collectionsService } from '@/services/collections-service';
import type { ClipSummary, Game, Tag } from '@/types/clip';
import type { Collection } from '@/types/collection';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
  }),
}));

const GAMES: Game[] = [
  { id: 'g-cs2', name: 'CS2', slug: 'cs2' },
  { id: 'g-val', name: 'Valorant', slug: 'valorant' },
];

const TAGS: Tag[] = [
  { id: 't1', name: 'clutch', slug: 'clutch' },
  { id: 't2', name: 'awp', slug: 'awp' },
];

const CLIPS: ClipSummary[] = [
  {
    id: 'clip-1',
    slug: 'slug-clutch-1',
    title: 'Clutch 1v4 de AWP na Mirage',
    privacy: 'public',
    video_url: 'https://cdn.clipai.com.br/clip1.mp4',
    thumbnail_url: 'https://cdn.clipai.com.br/thumb1.webp',
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
    tags: ['clutch', 'awp'],
    created_at: '2026-11-21T20:00:00Z',
  },
  {
    id: 'clip-2',
    slug: 'slug-ace-2',
    title: 'Ace de Vandal na Ascent',
    privacy: 'public',
    video_url: 'https://cdn.clipai.com.br/clip2.mp4',
    thumbnail_url: 'https://cdn.clipai.com.br/thumb2.webp',
    duration_seconds: 26,
    views_count: 85,
    likes_count: 8,
    favorites_count: 2,
    is_liked: false,
    is_favorited: false,
    is_liked_by_me: false,
    is_favorited_by_me: false,
    author: {
      id: 'u2',
      username: 'aspas_br',
      display_name: 'Erick Santos',
      avatar_url: null,
    },
    game: GAMES[1]!,
    tags: ['ace'],
    created_at: '2026-11-21T21:00:00Z',
  },
];

const COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    title: 'Clutches de CS2',
    description: 'Rounds decisivos',
    privacy: 'public',
    accent_color: '#2EB886',
    clips_count: 5,
    owner: { id: 'u1', username: 'fallen_br', display_name: 'Gabriel Toledo' },
    created_at: '2026-11-21T18:00:00Z',
    updated_at: '2026-11-21T18:00:00Z',
  },
  {
    id: 'col-2',
    title: 'Aces de Valorant',
    description: 'Highlights da ranked',
    privacy: 'friends',
    accent_color: '#E8B04B',
    clips_count: 3,
    owner: { id: 'u1', username: 'fallen_br', display_name: 'Gabriel Toledo' },
    created_at: '2026-11-21T19:00:00Z',
    updated_at: '2026-11-21T19:00:00Z',
  },
];

function renderDashboard() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <DashboardPage />
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('BentoDashboardWorkspace — Sprint 3 Signature Components', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    replaceMock.mockReset();

    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({ access_token: 'jwt_bento', token_type: 'bearer', expires_in: 900 }),
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
      if (url.endsWith('/auth/logout')) {
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.spyOn(clipsService, 'listGames').mockResolvedValue({
      items: GAMES,
      page: 1,
      page_size: 20,
      total: 2,
      total_pages: 1,
    });
    vi.spyOn(clipsService, 'listTags').mockResolvedValue({ items: TAGS });
    vi.spyOn(clipsService, 'listClips').mockResolvedValue({
      items: CLIPS,
      page: 1,
      page_size: 6,
      total: 2,
      total_pages: 2,
    });
    vi.spyOn(collectionsService, 'listCollections').mockResolvedValue({
      items: COLLECTIONS,
      page: 1,
      page_size: 12,
      total: 2,
      total_pages: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('handles LiquidSidebar collapse/expand, section filtering and ClipQueueList selection', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Clutch 1v4 de AWP na Mirage' }),
      ).toBeInTheDocument();
    });

    // Collapse and expand LiquidSidebar
    const sidebar = screen.getByLabelText('Sidebar Líquida de navegação');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    const collapseButtons = screen.getAllByRole('button', { name: 'Recolher sidebar' });
    await user.click(collapseButtons[0]!);
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');

    const expandButtons = screen.getAllByRole('button', { name: 'Expandir sidebar' });
    await user.click(expandButtons[0]!);
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    // Click second clip in ClipQueueList -> updates Hero Player immediately
    await user.click(screen.getByText('Ace de Vandal na Ascent'));
    expect(screen.getByRole('heading', { name: 'Ace de Vandal na Ascent' })).toBeInTheDocument();

    // Switch to Destaques (sort=popular) and Favoritos (favorited=true)
    const listClipsSpy = vi.spyOn(clipsService, 'listClips');
    await user.click(screen.getAllByRole('button', { name: 'Destaques' })[0]!);
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ sort: 'popular' }));
    });

    await user.click(screen.getAllByRole('button', { name: 'Favoritos' })[0]!);
    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ favorited: true }));
    });
  });

  it('applies optimistic UI for like/favorite and rolls back with error toast on failure', async () => {
    const user = userEvent.setup();

    vi.spyOn(clipsService, 'toggleLike')
      .mockResolvedValueOnce({
        clip_id: 'clip-1',
        liked: true,
        is_liked_by_me: true,
        likes_count: 16,
      })
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao curtir o clipe.',
        }),
      );

    vi.spyOn(clipsService, 'toggleFavorite').mockRejectedValueOnce(
      new ApiClientError({
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirme seu e-mail antes de favoritar.',
      }),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Curtir clipe' })).toBeInTheDocument();
    });

    // Like succeeds optimistically (15 -> 16)
    await user.click(screen.getByRole('button', { name: 'Curtir clipe' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remover curtida' })).toHaveTextContent('16');
    });

    // Unlike fails -> rolls back to 16 & shows error toast
    await user.click(screen.getByRole('button', { name: 'Remover curtida' }));
    await waitFor(() => {
      expect(screen.getByText('Erro ao curtir o clipe.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Remover curtida' })).toHaveTextContent('16');

    // Favorite fails -> rolls back & shows error toast
    await user.click(screen.getByRole('button', { name: 'Favoritar clipe' }));
    await waitFor(() => {
      expect(screen.getByText('Confirme seu e-mail antes de favoritar.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Favoritar clipe' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('supports bring-to-front reordering in CollectionsFanWidget, filtering and creating a collection', async () => {
    const user = userEvent.setup();

    const newCol: Collection = {
      id: 'col-3',
      title: 'Jogadas da Semana',
      description: 'Top jogadas',
      privacy: 'public',
      accent_color: '#2EB886',
      clips_count: 0,
      owner: { id: 'u1', username: 'fallen_br', display_name: 'Gabriel Toledo' },
      created_at: '2026-11-22T01:00:00Z',
      updated_at: '2026-11-22T01:00:00Z',
    };
    const createSpy = vi.spyOn(collectionsService, 'createCollection').mockResolvedValue(newCol);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('collection-fan-card-col-1')).toHaveAttribute('data-front', 'true');
    });
    expect(screen.getByTestId('collection-fan-card-col-2')).toHaveAttribute('data-front', 'false');

    // Click back card col-2 -> brings col-2 to front
    await user.click(screen.getByTestId('collection-fan-card-col-2'));
    expect(screen.getByTestId('collection-fan-card-col-2')).toHaveAttribute('data-front', 'true');
    expect(screen.getByTestId('collection-fan-card-col-1')).toHaveAttribute('data-front', 'false');

    // Click front card col-2 -> filters dashboard by col-2 and displays active banner
    await user.click(screen.getByTestId('collection-fan-card-col-2'));
    await waitFor(() => {
      expect(screen.getByTestId('active-collection-banner')).toHaveTextContent('Aces de Valorant');
    });

    // Clear active collection filter
    await user.click(screen.getByRole('button', { name: 'Remover filtro de coleção' }));
    expect(screen.queryByTestId('active-collection-banner')).not.toBeInTheDocument();

    // Open CreateCollectionModal via '+' button and create a collection
    await user.click(screen.getByRole('button', { name: 'Criar nova coleção' }));
    await user.type(screen.getByLabelText('Nome da coleção'), 'Jogadas da Semana');
    await user.click(screen.getByRole('button', { name: 'CRIAR COLEÇÃO' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Jogadas da Semana', privacy: 'public' }),
      );
    });
    expect(screen.getByText('Coleção criada com sucesso!')).toBeInTheDocument();
  });

  it('registers view once on play and saves/removes clip via AddToCollectionModal', async () => {
    const user = userEvent.setup();
    const viewSpy = vi
      .spyOn(clipsService, 'registerView')
      .mockResolvedValue({ clip_id: 'clip-1', views_count: 121 });

    vi.spyOn(collectionsService, 'getCollection').mockResolvedValue({
      ...COLLECTIONS[0]!,
      clips: [],
    });
    const addSpy = vi.spyOn(collectionsService, 'addClipToCollection').mockResolvedValue({
      collection_id: 'col-1',
      clip_id: 'clip-1',
      position: 0,
      added_at: '2026-11-22T01:00:00Z',
    });

    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByLabelText('Player de vídeo: Clutch 1v4 de AWP na Mirage'),
      ).toBeInTheDocument();
    });

    // Play triggers registerView once
    const videoEl = screen.getByLabelText('Player de vídeo: Clutch 1v4 de AWP na Mirage');
    fireEvent.play(videoEl);
    fireEvent.play(videoEl);

    await waitFor(() => {
      expect(viewSpy).toHaveBeenCalledTimes(1);
    });

    // Open AddToCollectionModal and check col-1
    await user.click(screen.getByRole('button', { name: 'Salvar em coleção' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'SALVAR EM COLEÇÃO' })).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('col-1', 'clip-1');
    });
  });
});
