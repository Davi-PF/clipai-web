import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadClipModal } from '@/components/upload/UploadClipModal';
import { ToastViewport } from '@/components/ui/Toast';
import { ToastProvider } from '@/contexts/toast-context';
import * as r2Upload from '@/lib/r2-upload';
import * as videoUtils from '@/lib/video-utils';
import { clipsService } from '@/services/clips-service';
import type { Clip } from '@/types/clip';

const MOCK_GAMES = [
  { id: 'g-cs2', name: 'Counter-Strike 2', slug: 'counter-strike-2' },
  { id: 'g-val', name: 'Valorant', slug: 'valorant' },
];

const MOCK_EXTRACTED = {
  durationSeconds: 34.5,
  width: 1920,
  height: 1080,
  resolutionLabel: '1080p',
  aspectRatio: '16:9',
  bitrateKbps: 11180,
  container: 'mp4' as const,
  videoMimeType: 'video/mp4' as const,
  videoSizeBytes: 48_234_496,
  thumbnailBlob: new Blob(['thumb'], { type: 'image/webp' }),
  thumbnailMimeType: 'image/webp' as const,
  thumbnailSizeBytes: 184_320,
  thumbnailPreviewUrl: 'blob:preview-webp',
  technicalMetadata: {
    container: 'mp4' as const,
    width: 1920,
    height: 1080,
    resolution_label: '1080p',
    bitrate_kbps: 11180,
    aspect_ratio: '16:9',
  },
};

const MOCK_CONFIRMED_CLIP: Clip = {
  id: 'clip-uuid-1',
  title: 'Clutch 1v4 de AWP na Mirage',
  description: 'Round decisivo.',
  status: 'ready',
  privacy: 'friends',
  video_url: 'https://cdn.clipai.com.br/video.mp4',
  thumbnail_url: 'https://cdn.clipai.com.br/thumb.webp',
  file_size_bytes: 48_234_496,
  duration_seconds: 34.5,
  mime_type: 'video/mp4',
  technical_metadata: MOCK_EXTRACTED.technicalMetadata,
  views_count: 0,
  likes_count: 0,
  favorites_count: 0,
  is_liked_by_me: false,
  is_favorited_by_me: false,
  author: {
    id: 'u1',
    username: 'fallen_br',
    display_name: 'Gabriel Toledo',
    avatar_url: null,
  },
  game: MOCK_GAMES[0]!,
  tags: ['clutch', 'awp'],
  created_at: '2026-11-21T22:05:00Z',
  updated_at: '2026-11-21T22:06:00Z',
};

describe('UploadClipModal', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(clipsService, 'listGames').mockResolvedValue({
      items: MOCK_GAMES,
      page: 1,
      page_size: 50,
      total: 2,
      total_pages: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates required fields and renders preview, tags, privacy and upload completion', async () => {
    const user = userEvent.setup();
    const onUploadSuccess = vi.fn();

    vi.spyOn(videoUtils, 'extractVideoMetadataAndThumbnail').mockResolvedValue(MOCK_EXTRACTED);
    vi.spyOn(clipsService, 'requestUploadUrl').mockResolvedValue({
      clip_id: 'clip-uuid-1',
      status: 'pending_upload',
      expires_in: 900,
      video_upload: {
        url: 'https://r2.example.com/video',
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'Content-Length': '48234496' },
      },
      thumbnail_upload: {
        url: 'https://r2.example.com/thumb',
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp', 'Content-Length': '184320' },
      },
    });
    vi.spyOn(r2Upload, 'uploadFileToPresignedUrl').mockImplementation(
      async (_url, _file, _ct, onProgress) => {
        onProgress(55);
        onProgress(100);
      },
    );
    vi.spyOn(clipsService, 'confirmUpload').mockResolvedValue(MOCK_CONFIRMED_CLIP);

    render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={vi.fn()} onUploadSuccess={onUploadSuccess} />
        <ToastViewport />
      </ToastProvider>,
    );

    // Submits empty form to verify PT-BR validation
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));
    expect(
      screen.getByText('Selecione um vídeo MP4 ou WebM válido para continuar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Informe um título entre 3 e 120 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Selecione o jogo do clipe.')).toBeInTheDocument();

    // Select video file
    const file = new File(['video-bytes'], 'clutch_mirage.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByAltText('Pré-visualização da capa gerada do clipe')).toBeInTheDocument();
    });
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('46.0 MB')).toBeInTheDocument();

    // Update title, select game, add tags, select privacy
    const titleInput = screen.getByLabelText('Título do clipe');
    await user.clear(titleInput);
    await user.type(titleInput, 'Clutch 1v4 de AWP na Mirage');
    await user.selectOptions(screen.getByLabelText('Jogo'), 'g-cs2');

    const tagInput = screen.getByLabelText('Tags (opcional)');
    await user.type(tagInput, 'a{Enter}');
    expect(screen.getByText('Use pelo menos 2 letras ou números para a tag.')).toBeInTheDocument();
    await user.clear(tagInput);
    await user.type(tagInput, 'clutch{Enter}awp{Enter}mirage{Enter}');
    expect(screen.getByText('#clutch')).toBeInTheDocument();
    expect(screen.getByText('#awp')).toBeInTheDocument();
    expect(screen.getByText('#mirage')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover tag mirage' }));
    expect(screen.queryByText('#mirage')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Descrição (opcional)'), 'Round decisivo na Mirage.');

    await user.click(screen.getByRole('button', { name: /Só Amigos/i }));
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));

    await waitFor(() => {
      expect(screen.getByText('Seu clipe está no ar!')).toBeInTheDocument();
    });
    expect(onUploadSuccess).toHaveBeenCalledWith(MOCK_CONFIRMED_CLIP);
    expect(screen.getByRole('button', { name: 'IR PARA O CLIPE' })).toBeInTheDocument();
  });

  it('displays friendly PT-BR error and supports retry on R2 upload failure', async () => {
    const user = userEvent.setup();

    vi.spyOn(videoUtils, 'extractVideoMetadataAndThumbnail').mockResolvedValue(MOCK_EXTRACTED);
    vi.spyOn(clipsService, 'requestUploadUrl').mockResolvedValue({
      clip_id: 'clip-uuid-1',
      status: 'pending_upload',
      expires_in: 900,
      video_upload: {
        url: 'https://r2.example.com/video',
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'Content-Length': '48234496' },
      },
      thumbnail_upload: {
        url: 'https://r2.example.com/thumb',
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp', 'Content-Length': '184320' },
      },
    });

    const uploadSpy = vi
      .spyOn(r2Upload, 'uploadFileToPresignedUrl')
      .mockRejectedValueOnce(new r2Upload.R2UploadError('Erro de rede ou CORS no R2.'))
      .mockResolvedValue(undefined);

    vi.spyOn(clipsService, 'confirmUpload').mockResolvedValue(MOCK_CONFIRMED_CLIP);

    render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={vi.fn()} />
        <ToastViewport />
      </ToastProvider>,
    );

    const file = new File(['video-bytes'], 'clutch_mirage.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Jogo'), 'g-cs2');
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));

    await waitFor(() => {
      expect(screen.getByText('Erro de rede ou CORS no R2.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(screen.getByText('Seu clipe está no ar!')).toBeInTheDocument();
    });
    expect(uploadSpy).toHaveBeenCalledTimes(3);
  });
});
