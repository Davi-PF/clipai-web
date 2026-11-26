import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadClipModal } from '@/components/upload/UploadClipModal';
import { ToastViewport } from '@/components/ui/Toast';
import { ToastProvider } from '@/contexts/toast-context';
import * as ffmpegProcessor from '@/lib/ffmpeg-processor';
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
    vi.spyOn(videoUtils, 'extractVideoFilmstripFrames').mockResolvedValue([]);
    vi.spyOn(ffmpegProcessor, 'processClipWithFfmpeg').mockImplementation(
      async ({ onProgress }) => {
        onProgress?.(45);
        onProgress?.(100);
        return {
          file: new File(['encoded-bytes'], 'clutch_mirage-edited.mp4', { type: 'video/mp4' }),
          mimeType: 'video/mp4',
          wasProcessed: true,
        };
      },
    );
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

  it('keeps the video objectUrl stable across re-renders and revokes it only on file change or unmount', async () => {
    const user = userEvent.setup();
    const createUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:stable-video-url-1')
      .mockReturnValueOnce('blob:stable-video-url-2');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    vi.spyOn(videoUtils, 'extractVideoMetadataAndThumbnail').mockResolvedValue(MOCK_EXTRACTED);

    const { unmount } = render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={vi.fn()} />
        <ToastViewport />
      </ToastProvider>,
    );

    const file1 = new File(['video-1'], 'clip_one.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file1] } });

    await waitFor(() => {
      expect(screen.getByTestId('clip-video-editor')).toBeInTheDocument();
    });

    const videoEl = screen.getByLabelText(
      'Pré-visualização do editor de clipe',
    ) as HTMLVideoElement;
    expect(videoEl.getAttribute('src')).toBe('blob:stable-video-url-1');
    expect(createUrlSpy).toHaveBeenCalledTimes(1);

    // Trigger multiple modal re-renders (title, description, privacy) -> objectUrl must NOT recreate or revoke
    await user.type(screen.getByLabelText('Título do clipe'), ' editado');
    await user.type(screen.getByLabelText('Descrição (opcional)'), 'Teste de estabilidade');
    await user.click(screen.getByRole('button', { name: /Só Amigos/i }));

    expect(createUrlSpy).toHaveBeenCalledTimes(1);
    expect(revokeUrlSpy).not.toHaveBeenCalledWith('blob:stable-video-url-1');
    expect(videoEl.getAttribute('src')).toBe('blob:stable-video-url-1');

    // Selecting a new file revokes the previous objectUrl and creates a new one
    const file2 = new File(['video-2'], 'clip_two.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByLabelText('Pré-visualização do editor de clipe').getAttribute('src')).toBe(
        'blob:stable-video-url-2',
      );
    });
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:stable-video-url-1');
    expect(createUrlSpy).toHaveBeenCalledTimes(2);

    // Unmounting modal revokes the active objectUrl
    unmount();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:stable-video-url-2');
  });

  it('closes immediately when empty, and intercepts cancel/close during FFmpeg rendering with Continue and Confirm options', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    vi.spyOn(videoUtils, 'extractVideoMetadataAndThumbnail').mockResolvedValue(MOCK_EXTRACTED);

    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(ffmpegProcessor, 'processClipWithFfmpeg').mockImplementation(
      ({ onProgress, signal }) => {
        capturedSignal = signal;
        onProgress?.(35);
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(
              new ffmpegProcessor.FfmpegProcessingError('Renderização cancelada.', {
                isAborted: true,
              }),
            );
          });
        });
      },
    );

    render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={onClose} />
        <ToastViewport />
      </ToastProvider>,
    );

    // 1. Before selecting a file, clicking Cancel closes immediately without confirmation
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cancel-upload-confirm-dialog')).not.toBeInTheDocument();
    onClose.mockClear();

    // 2. Load a video file -> clicking backdrop opens confirmation dialog (loaded video guard)
    const file = new File(['video-bytes'], 'clutch_render.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByTestId('clip-video-editor')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('upload-modal-backdrop'));
    expect(screen.getByTestId('cancel-upload-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Você já carregou um vídeo neste formulário/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Escape closes only the confirmation dialog, keeping modal open
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('cancel-upload-confirm-dialog')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // 3. Start FFmpeg rendering
    await user.selectOptions(screen.getByLabelText('Jogo'), 'g-cs2');
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));

    await waitFor(() => {
      expect(screen.getByTestId('render-progress-panel')).toBeInTheDocument();
    });

    // Click "Cancelar renderização" -> opens confirmation dialog instead of aborting immediately
    await user.click(screen.getByRole('button', { name: 'Cancelar renderização' }));
    const confirmDialog = screen.getByTestId('cancel-upload-confirm-dialog');
    expect(confirmDialog).toBeInTheDocument();
    expect(confirmDialog).toHaveTextContent('CANCELAR ENVIO DO CLIPE?');
    expect(confirmDialog).toHaveTextContent(
      /renderização do clipe no navegador está em andamento/i,
    );
    expect(capturedSignal?.aborted).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    // Choose "Continuar envio" -> keeps rendering running and closes only the confirmation dialog
    await user.click(screen.getByRole('button', { name: 'Continuar envio' }));
    expect(screen.queryByTestId('cancel-upload-confirm-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('render-progress-panel')).toBeInTheDocument();
    expect(capturedSignal?.aborted).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    // Click close (X) and choose "Sim, cancelar" -> aborts FFmpeg and closes the modal
    await user.click(screen.getByRole('button', { name: 'Fechar modal de upload' }));
    expect(screen.getByTestId('cancel-upload-confirm-dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(capturedSignal?.aborted).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cancel-upload-confirm-dialog')).not.toBeInTheDocument();
  });

  it('freezes visual progress and blocks pipeline while confirmation dialog is open, then resumes cleanly on Continue', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUploadSuccess = vi.fn();

    vi.spyOn(videoUtils, 'extractVideoMetadataAndThumbnail').mockResolvedValue(MOCK_EXTRACTED);

    let emitFfmpegProgress: ((percent: number) => void) | undefined;
    let resolveFfmpeg!: (value: ffmpegProcessor.ProcessClipResult) => void;
    vi.spyOn(ffmpegProcessor, 'processClipWithFfmpeg').mockImplementation(({ onProgress }) => {
      emitFfmpegProgress = onProgress;
      onProgress?.(53);
      return new Promise((resolve) => {
        resolveFfmpeg = resolve;
      });
    });

    const requestUrlSpy = vi.spyOn(clipsService, 'requestUploadUrl').mockResolvedValue({
      clip_id: 'clip-uuid-1',
      status: 'pending_upload',
      expires_in: 900,
      video_upload: {
        url: 'https://r2.example.com/video',
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'Content-Length': '48234496' },
      },
      thumbnail_upload: null,
    });
    const r2Spy = vi.spyOn(r2Upload, 'uploadFileToPresignedUrl').mockResolvedValue(undefined);
    const confirmSpy = vi
      .spyOn(clipsService, 'confirmUpload')
      .mockResolvedValue(MOCK_CONFIRMED_CLIP);

    render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={onClose} onUploadSuccess={onUploadSuccess} />
        <ToastViewport />
      </ToastProvider>,
    );

    const file = new File(['video-bytes'], 'clutch_pause.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByTestId('clip-video-editor')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Jogo'), 'g-cs2');
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));

    await waitFor(() => {
      expect(screen.getByTestId('render-progress-panel')).toHaveTextContent('53%');
    });

    // Open cancel confirmation while rendering is at 53% -> freezes UI progress & pauses pipeline
    await user.click(screen.getByRole('button', { name: 'Cancelar renderização' }));
    const confirmOverlay = screen.getByTestId('cancel-upload-confirm-dialog');
    const confirmCard = screen.getByTestId('cancel-upload-confirm-card');
    expect(confirmOverlay).toHaveClass('flex', 'items-center', 'justify-center', 'p-4');
    expect(confirmCard).toHaveClass('my-auto');
    expect(confirmOverlay.parentElement).toBe(document.body);

    // FFmpeg keeps emitting progress (85%, 100%) and finishes while confirmation dialog is open
    emitFfmpegProgress?.(85);
    emitFfmpegProgress?.(100);
    resolveFfmpeg({
      file: new File(['encoded-bytes'], 'clutch_pause-edited.mp4', { type: 'video/mp4' }),
      mimeType: 'video/mp4',
      wasProcessed: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 40));
    // UI progress MUST remain frozen at 53% and pipeline MUST NOT advance to R2 or publish
    expect(screen.getByTestId('render-progress-panel')).toHaveTextContent(
      'Renderizando clipe no navegador (53%)',
    );
    expect(screen.getByTestId('render-progress-panel')).not.toHaveTextContent('100%');
    expect(requestUrlSpy).not.toHaveBeenCalled();
    expect(r2Spy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('cancel-upload-confirm-dialog')).toBeInTheDocument();

    // Choose "Continuar envio" -> unfreezes UI, releases pause gate and finishes upload cleanly
    await user.click(screen.getByRole('button', { name: 'Continuar envio' }));

    await waitFor(() => {
      expect(screen.getByText('Seu clipe está no ar!')).toBeInTheDocument();
    });
    expect(requestUrlSpy).toHaveBeenCalledTimes(1);
    expect(r2Spy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onUploadSuccess).toHaveBeenCalledWith(MOCK_CONFIRMED_CLIP);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('aborts cleanly without uploading when FFmpeg finishes during confirmation dialog and user confirms cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUploadSuccess = vi.fn();

    vi.spyOn(videoUtils, 'extractVideoMetadataAndThumbnail').mockResolvedValue(MOCK_EXTRACTED);

    let emitFfmpegProgress: ((percent: number) => void) | undefined;
    let resolveFfmpeg!: (value: ffmpegProcessor.ProcessClipResult) => void;
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(ffmpegProcessor, 'processClipWithFfmpeg').mockImplementation(
      ({ onProgress, signal }) => {
        emitFfmpegProgress = onProgress;
        capturedSignal = signal;
        onProgress?.(42);
        return new Promise((resolve) => {
          resolveFfmpeg = resolve;
        });
      },
    );

    const requestUrlSpy = vi.spyOn(clipsService, 'requestUploadUrl');
    const confirmSpy = vi.spyOn(clipsService, 'confirmUpload');

    render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={onClose} onUploadSuccess={onUploadSuccess} />
        <ToastViewport />
      </ToastProvider>,
    );

    const file = new File(['video-bytes'], 'clutch_cancel_after_ffmpeg.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByTestId('clip-video-editor')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Jogo'), 'g-cs2');
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));

    await waitFor(() => {
      expect(screen.getByTestId('render-progress-panel')).toHaveTextContent('42%');
    });

    await user.click(screen.getByRole('button', { name: 'Cancelar renderização' }));
    emitFfmpegProgress?.(100);
    resolveFfmpeg({
      file: new File(['encoded-bytes'], 'clutch_cancel_after_ffmpeg-edited.mp4', {
        type: 'video/mp4',
      }),
      mimeType: 'video/mp4',
      wasProcessed: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByTestId('render-progress-panel')).toHaveTextContent('42%');

    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(capturedSignal?.aborted).toBe(true);
    expect(requestUrlSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('freezes R2 upload progress while dialog is open and aborts immediately when confirming cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
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
      thumbnail_upload: null,
    });

    let emitR2Progress: ((percent: number) => void) | undefined;
    let capturedR2Signal: AbortSignal | undefined;
    vi.spyOn(r2Upload, 'uploadFileToPresignedUrl').mockImplementation(
      (_url, _file, _ct, onProgress, signal) => {
        emitR2Progress = onProgress;
        capturedR2Signal = signal;
        onProgress(40);
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(
              new r2Upload.R2UploadError('Envio cancelado pelo usuário.', { isAborted: true }),
            );
          });
        });
      },
    );
    const confirmSpy = vi
      .spyOn(clipsService, 'confirmUpload')
      .mockResolvedValue(MOCK_CONFIRMED_CLIP);

    render(
      <ToastProvider>
        <UploadClipModal isOpen onClose={onClose} onUploadSuccess={onUploadSuccess} />
        <ToastViewport />
      </ToastProvider>,
    );

    const file = new File(['video-bytes'], 'clutch_r2_abort.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('clip-file-input'), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByTestId('clip-video-editor')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Jogo'), 'g-cs2');
    await user.click(screen.getByRole('button', { name: 'PUBLICAR CLIPE' }));

    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-panel')).toHaveTextContent(
        'Enviando vídeo para o R2 (40%)',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Cancelar envio' }));
    expect(screen.getByTestId('cancel-upload-confirm-dialog')).toBeInTheDocument();
    expect(capturedR2Signal?.aborted).toBe(false);

    // Late R2 progress events while confirmation dialog is open MUST NOT update UI
    emitR2Progress?.(88);
    expect(screen.getByTestId('upload-progress-panel')).toHaveTextContent(
      'Enviando vídeo para o R2 (40%)',
    );
    expect(screen.getByTestId('upload-progress-panel')).not.toHaveTextContent('88%');

    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(capturedR2Signal?.aborted).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
