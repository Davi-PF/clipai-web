import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClipVideoEditor } from '@/components/upload/ClipVideoEditor';
import { createDefaultEditSettings, estimateEditedClipSize } from '@/lib/video-editor-utils';
import * as videoUtils from '@/lib/video-utils';
import type { ClipEditSettings, ExtractedVideoResult } from '@/types/clip';

const BASE_META: ExtractedVideoResult = {
  durationSeconds: 150,
  width: 1920,
  height: 1080,
  resolutionLabel: '1080p',
  aspectRatio: '16:9',
  bitrateKbps: 12000,
  container: 'mp4',
  videoMimeType: 'video/mp4',
  videoSizeBytes: 140 * 1024 * 1024,
  thumbnailBlob: new Blob(['thumb'], { type: 'image/webp' }),
  thumbnailMimeType: 'image/webp',
  thumbnailSizeBytes: 120_000,
  thumbnailPreviewUrl: 'blob:initial-thumb',
  technicalMetadata: {
    container: 'mp4',
    width: 1920,
    height: 1080,
    resolution_label: '1080p',
    bitrate_kbps: 12000,
    aspect_ratio: '16:9',
  },
};

function EditorHarness({
  meta = BASE_META,
  onCaptureThumbnail = vi.fn(),
  onChangeFileClick = vi.fn(),
}: Readonly<{
  meta?: ExtractedVideoResult;
  onCaptureThumbnail?: ReturnType<typeof vi.fn>;
  onChangeFileClick?: ReturnType<typeof vi.fn>;
}>) {
  const [settings, setSettings] = useState<ClipEditSettings>(() =>
    createDefaultEditSettings(meta.durationSeconds),
  );
  const estimate = estimateEditedClipSize({
    originalBytes: meta.videoSizeBytes,
    totalDuration: meta.durationSeconds,
    settings,
  });

  return (
    <ClipVideoEditor
      fileName="clutch_longo.mp4"
      videoPreviewUrl="blob:preview-video"
      extractedMeta={meta}
      editSettings={settings}
      editEstimate={estimate}
      onChangeFileClick={onChangeFileClick}
      onUpdateEditSettings={(updater) =>
        setSettings((prev) =>
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater },
        )
      }
      onCaptureThumbnail={onCaptureThumbnail}
    />
  );
}

function firePointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
  fireEvent(target, event);
}

describe('ClipVideoEditor, ClipTrimTimeline & ClipExportControls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 10 filmstrip frames, compact controls, 120s limit warning, trim interactions, presets, mute and frame capture', async () => {
    const user = userEvent.setup();
    const onCaptureThumbnail = vi.fn();

    const mockFrames = Array.from(
      { length: 10 },
      (_, idx) => `data:image/jpeg;base64,mock-frame-${idx}`,
    );
    vi.spyOn(videoUtils, 'extractVideoFilmstripFrames').mockResolvedValue(mockFrames);
    vi.spyOn(videoUtils, 'captureThumbnailFromVideoElement').mockResolvedValueOnce({
      blob: new Blob(['new-frame'], { type: 'image/webp' }),
      mimeType: 'image/webp',
      sizeBytes: 98_000,
      previewUrl: 'blob:captured-frame',
    });

    render(<EditorHarness onCaptureThumbnail={onCaptureThumbnail} />);

    // Filmstrip renders all 10 extracted frames inside the timeline
    await waitFor(() => {
      expect(screen.getAllByTestId('filmstrip-frame')).toHaveLength(10);
    });

    // Compact thumbnail preview + segmented presets + 120s warning
    expect(screen.getByAltText('Pré-visualização da capa gerada do clipe')).toBeInTheDocument();
    expect(screen.getByText(/Vídeo original excede 120s/i)).toBeInTheDocument();
    expect(screen.getByTestId('export-preset-720p')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('trim-duration-badge')).toHaveTextContent('02:00.0 / máx 120s');

    // Keyboard adjustment on start and end handles
    const startHandle = screen.getByTestId('trim-handle-start');
    const endHandle = screen.getByTestId('trim-handle-end');
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    expect(screen.getByTestId('trim-start-label')).toHaveTextContent('Início: 00:01.0');

    fireEvent.keyDown(endHandle, { key: 'ArrowLeft' });
    expect(screen.getByTestId('trim-end-label')).toHaveTextContent('Fim: 01:59.0');

    // Pointer drag on timeline track and handles
    const track = screen.getByTestId('clip-trim-track');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 48,
      width: 300,
      height: 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    firePointer(startHandle, 'pointerdown', 30);
    firePointer(startHandle, 'pointermove', 60);
    firePointer(startHandle, 'pointerup', 60);
    expect(screen.getByTestId('trim-start-label')).toHaveTextContent('Início: 00:30.0');

    firePointer(track, 'pointerdown', 120);
    firePointer(track, 'pointerup', 120);

    // Exercise preview play/pause, loop at endTime & capture frame
    const videoEl = screen.getByLabelText(
      'Pré-visualização do editor de clipe',
    ) as HTMLVideoElement;
    Object.defineProperty(videoEl, 'paused', { value: true, writable: true, configurable: true });
    videoEl.play = vi.fn().mockImplementation(async () => {
      Object.defineProperty(videoEl, 'paused', { value: false, configurable: true });
      fireEvent.play(videoEl);
    });
    videoEl.pause = vi.fn().mockImplementation(() => {
      Object.defineProperty(videoEl, 'paused', { value: true, configurable: true });
      fireEvent.pause(videoEl);
    });

    await user.click(screen.getByRole('button', { name: 'Reproduzir prévia do corte' }));
    expect(videoEl.play).toHaveBeenCalled();

    videoEl.currentTime = 125;
    fireEvent.timeUpdate(videoEl);
    expect(videoEl.currentTime).toBe(30);

    await user.click(screen.getByRole('button', { name: 'Pausar prévia do corte' }));
    expect(videoEl.pause).toHaveBeenCalled();

    // Capture current frame as thumbnail
    videoEl.currentTime = 42.5;
    await user.click(screen.getByTestId('capture-thumbnail-frame-btn'));
    await waitFor(() => {
      expect(onCaptureThumbnail).toHaveBeenCalledWith(
        expect.objectContaining({ previewUrl: 'blob:captured-frame' }),
        42.5,
      );
    });

    // Switch to 480p and toggle Mute Audio
    await user.click(screen.getByTestId('export-preset-480p'));
    expect(screen.getByTestId('export-preset-480p')).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByTestId('toggle-mute-audio-btn'));
    expect(screen.getByTestId('toggle-mute-audio-btn')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Áudio mutado')).toBeInTheDocument();

    // Switch to Original on 140 MB file -> reset start to 0 (120s trimmed = ~112 MB > 100 MB)
    await user.click(screen.getByTestId('export-preset-original'));
    firePointer(startHandle, 'pointerdown', 0);
    firePointer(startHandle, 'pointerup', 0);
    expect(screen.getByTestId('estimated-size-summary')).toHaveTextContent(
      'Acima de 100 MB — reduza o corte ou use 480p Leve',
    );
  });

  it('displays friendly error message when manual frame capture fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(videoUtils, 'extractVideoFilmstripFrames').mockResolvedValue([]);
    vi.spyOn(videoUtils, 'captureThumbnailFromVideoElement').mockRejectedValueOnce(
      new Error('canvas tainted'),
    );

    render(<EditorHarness />);
    await user.click(screen.getByTestId('capture-thumbnail-frame-btn'));

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível capturar o frame atual. Tente outro instante do vídeo.'),
      ).toBeInTheDocument();
    });
  });

  it('pauses on drag, ignores onTimeUpdate while dragging, defers stacked seeks until onSeeked and clamps near duration', async () => {
    const user = userEvent.setup();
    vi.spyOn(videoUtils, 'extractVideoFilmstripFrames').mockResolvedValue([]);

    const shortMeta: ExtractedVideoResult = {
      ...BASE_META,
      durationSeconds: 100,
    };

    render(<EditorHarness meta={shortMeta} />);

    const videoEl = screen.getByLabelText(
      'Pré-visualização do editor de clipe',
    ) as HTMLVideoElement;
    const track = screen.getByTestId('clip-trim-track');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 48,
      width: 200,
      height: 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    let seeking = false;
    let currentTimeValue = 10;
    const currentTimeWrites: number[] = [];

    Object.defineProperty(videoEl, 'duration', { value: 100, configurable: true });
    Object.defineProperty(videoEl, 'paused', { value: false, writable: true, configurable: true });
    Object.defineProperty(videoEl, 'seeking', {
      get: () => seeking,
      configurable: true,
    });
    Object.defineProperty(videoEl, 'currentTime', {
      get: () => currentTimeValue,
      set: (value: number) => {
        currentTimeValue = value;
        currentTimeWrites.push(value);
      },
      configurable: true,
    });
    const pauseSpy = vi.fn(() => {
      Object.defineProperty(videoEl, 'paused', { value: true, configurable: true });
      fireEvent.pause(videoEl);
    });
    videoEl.pause = pauseSpy;

    // 1. Start dragging playhead while playing -> pauses video and writes initial seek (25s)
    firePointer(track, 'pointerdown', 50);
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(currentTimeWrites).toEqual([25]);

    // 2. While dragging & video.seeking is true, timeUpdate is ignored and stacked moves defer until onSeeked
    seeking = true;
    currentTimeValue = 77;
    fireEvent.timeUpdate(videoEl);
    expect(screen.getByText('00:25.0 / 01:40.0')).toBeInTheDocument();

    firePointer(track, 'pointermove', 80); // 40s
    firePointer(track, 'pointermove', 120); // 60s
    expect(currentTimeWrites).toEqual([25]);

    // 3. When seek completes (onSeeked), only the latest pending seek (60s) is applied
    seeking = false;
    fireEvent.seeked(videoEl);
    expect(currentTimeWrites).toEqual([25, 60]);

    firePointer(track, 'pointerup', 120);

    // 4. Dragging end handle to exact end (100s) clamps video.currentTime to 99.95s (duration - 0.05)
    const endHandle = screen.getByTestId('trim-handle-end');
    firePointer(endHandle, 'pointerdown', 200);
    firePointer(endHandle, 'pointerup', 200);
    expect(currentTimeWrites.at(-1)).toBe(99.95);

    // 5. Move start handle to 15s, then test onEnded loop and recovery rewind button while seeking
    const startHandle = screen.getByTestId('trim-handle-start');
    firePointer(startHandle, 'pointerdown', 30);
    firePointer(startHandle, 'pointerup', 30);
    expect(currentTimeWrites.at(-1)).toBe(15);

    currentTimeValue = 99.96;
    fireEvent.ended(videoEl);
    expect(currentTimeWrites.at(-1)).toBe(15);

    seeking = true;
    currentTimeValue = 50;
    await user.click(screen.getByRole('button', { name: 'Voltar ao início do corte' }));
    expect(pauseSpy).toHaveBeenCalledTimes(2);
    expect(currentTimeWrites.at(-1)).toBe(15);
  });
});
