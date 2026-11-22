import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipDetailView } from '@/components/player/ClipDetailView';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ApiClientError, clearAccessToken } from '@/lib/api-client';
import { clipsService } from '@/services/clips-service';
import type { Clip } from '@/types/clip';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
  }),
}));

const SAMPLE_CLIP: Clip = {
  id: 'clip-123',
  title: 'Ace de Vandal na Ascent',
  description: 'Round eco perfeito.',
  status: 'ready',
  privacy: 'public',
  video_url: 'https://cdn.clipai.com.br/video.mp4',
  thumbnail_url: 'https://cdn.clipai.com.br/thumb.webp',
  file_size_bytes: 20_971_520,
  duration_seconds: 28,
  mime_type: 'video/mp4',
  technical_metadata: {
    container: 'mp4',
    width: 1920,
    height: 1080,
    resolution_label: '1080p',
    aspect_ratio: '16:9',
  },
  views_count: 42,
  likes_count: 9,
  favorites_count: 3,
  is_liked_by_me: false,
  is_favorited_by_me: false,
  author: {
    id: 'owner-1',
    username: 'aspas_br',
    display_name: 'Erick Santos',
    avatar_url: null,
  },
  game: {
    id: 'g-val',
    name: 'Valorant',
    slug: 'valorant',
  },
  tags: ['ace', 'vandal'],
  created_at: '2026-11-21T20:00:00Z',
  updated_at: '2026-11-21T20:00:00Z',
};

function renderView(slug = 'clip-123') {
  return render(
    <ToastProvider>
      <AuthProvider>
        <ClipDetailView slug={slug} />
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('ClipDetailView (/c/[slug]) & ClipPlayer', () => {
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

  it('renders clip details, player controls and copies shareable link with green toast', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    vi.spyOn(clipsService, 'getClipBySlug').mockResolvedValue(SAMPLE_CLIP);

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ace de Vandal na Ascent' })).toBeInTheDocument();
    });

    expect(screen.getByText('Valorant')).toBeInTheDocument();
    expect(screen.getByText('#ace')).toBeInTheDocument();
    expect(screen.getByText('1080p • 00:28 • 20.0 MB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'EXCLUIR' })).not.toBeInTheDocument();

    // Exercise player controls & events
    const videoEl = screen.getByLabelText(
      'Player de vídeo: Ace de Vandal na Ascent',
    ) as HTMLVideoElement;
    Object.defineProperty(videoEl, 'duration', { value: 28, configurable: true });
    Object.defineProperty(videoEl, 'paused', { value: true, writable: true, configurable: true });
    videoEl.play = vi.fn().mockImplementation(async () => {
      Object.defineProperty(videoEl, 'paused', { value: false, configurable: true });
      fireEvent.play(videoEl);
    });
    videoEl.pause = vi.fn().mockImplementation(() => {
      Object.defineProperty(videoEl, 'paused', { value: true, configurable: true });
      fireEvent.pause(videoEl);
    });

    const viewSpy = vi
      .spyOn(clipsService, 'registerView')
      .mockResolvedValue({ clip_id: 'clip-123', views_count: 43 });

    fireEvent.loadedMetadata(videoEl);
    await user.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
    expect(videoEl.play).toHaveBeenCalled();

    fireEvent.waiting(videoEl);
    expect(screen.getByLabelText('Carregando vídeo')).toBeInTheDocument();
    fireEvent.playing(videoEl);
    fireEvent.canPlay(videoEl);

    videoEl.currentTime = 4;
    fireEvent.timeUpdate(videoEl);
    await waitFor(() => {
      expect(viewSpy).toHaveBeenCalledWith('clip-123');
    });

    fireEvent.change(screen.getByLabelText('Barra de progresso do vídeo'), {
      target: { value: '12' },
    });
    expect(videoEl.currentTime).toBe(12);

    fireEvent.change(screen.getByLabelText('Controle de volume'), {
      target: { value: '0.5' },
    });
    expect(videoEl.volume).toBe(0.5);

    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(videoEl.pause).toHaveBeenCalled();
    fireEvent.ended(videoEl);

    await user.click(screen.getByRole('button', { name: 'Silenciar' }));
    expect(screen.getByRole('button', { name: 'Ativar som' })).toBeInTheDocument();

    // Fullscreen toggle
    const playerContainer = videoEl.parentElement!;
    playerContainer.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: 'Tela cheia' }));
    expect(playerContainer.requestFullscreen).toHaveBeenCalled();

    // Copy link toast
    await user.click(screen.getByRole('button', { name: 'COPIAR LINK' }));
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/c/clip-123'));
    await waitFor(() => {
      expect(screen.getByText('Link copiado!')).toBeInTheDocument();
    });
  });

  it('renders 404 state when clip does not exist', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    vi.spyOn(clipsService, 'getClipBySlug').mockRejectedValue(
      new ApiClientError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: 'O recurso solicitado não foi encontrado.',
      }),
    );

    renderView('missing-slug');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CLIPE NÃO ENCONTRADO' })).toBeInTheDocument();
    });
  });

  it('renders restricted friends state with login CTA for anonymous visitor', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    vi.spyOn(clipsService, 'getClipBySlug').mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para acessar este clipe.',
      }),
    );

    renderView('friends-only');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CLIPE RESTRITO A AMIGOS' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'FAZER LOGIN PARA ASSISTIR' })).toBeInTheDocument();
  });

  it('allows the clip owner to edit and delete the clip', async () => {
    const user = userEvent.setup();

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'owner_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'owner-1',
            username: 'aspas_br',
            email: 'aspas@clipai.com.br',
            display_name: 'Erick Santos',
            avatar_url: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      );

    vi.spyOn(clipsService, 'listGames').mockResolvedValue({
      items: [SAMPLE_CLIP.game],
      page: 1,
      page_size: 50,
      total: 1,
      total_pages: 1,
    });
    vi.spyOn(clipsService, 'getClipBySlug').mockResolvedValue(SAMPLE_CLIP);
    vi.spyOn(clipsService, 'updateClip').mockResolvedValue({
      ...SAMPLE_CLIP,
      title: 'Ace Atualizado',
    });
    vi.spyOn(clipsService, 'toggleLike').mockResolvedValue({
      clip_id: 'clip-123',
      liked: true,
      is_liked_by_me: true,
      likes_count: 10,
    });
    vi.spyOn(clipsService, 'toggleFavorite').mockResolvedValue({
      clip_id: 'clip-123',
      favorited: true,
      is_favorited_by_me: true,
      favorites_count: 4,
    });
    const deleteSpy = vi.spyOn(clipsService, 'deleteClip').mockResolvedValue(undefined);

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    });

    // Social like and favorite actions
    await user.click(screen.getByRole('button', { name: 'Curtir clipe' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remover curtida' })).toHaveTextContent('10');
    });

    await user.click(screen.getByRole('button', { name: 'Favoritar clipe' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remover dos favoritos' })).toBeInTheDocument();
    });

    // Edit flow
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const editTitleInput = screen.getByLabelText('Título');
    await user.clear(editTitleInput);
    await user.type(editTitleInput, 'Ace Atualizado');
    await user.click(screen.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ace Atualizado' })).toBeInTheDocument();
    });

    // Delete flow
    await user.click(screen.getByRole('button', { name: 'EXCLUIR' }));
    expect(
      screen.getByRole('heading', { name: 'EXCLUIR CLIPE PERMANENTEMENTE?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR EXCLUSÃO' }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('clip-123');
    });
    expect(replaceMock).toHaveBeenCalledWith('/dashboard');
  });
});
