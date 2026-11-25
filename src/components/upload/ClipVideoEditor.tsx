'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ClipExportControls } from '@/components/upload/ClipExportControls';
import { ClipTrimTimeline } from '@/components/upload/ClipTrimTimeline';
import { formatFileSizeMb } from '@/lib/validators';
import { clampSafeSeekTime, formatPreciseTime } from '@/lib/video-editor-utils';
import {
  captureThumbnailFromVideoElement,
  extractVideoFilmstripFrames,
  type CapturedThumbnailResult,
} from '@/lib/video-utils';
import type { ClipEditEstimate, ClipEditSettings, ExtractedVideoResult } from '@/types/clip';

export interface ClipVideoEditorProps {
  fileName: string;
  videoPreviewUrl: string;
  extractedMeta: ExtractedVideoResult;
  editSettings: ClipEditSettings;
  editEstimate: ClipEditEstimate;
  disabled?: boolean;
  onChangeFileClick: () => void;
  onUpdateEditSettings: (
    updater: Partial<ClipEditSettings> | ((prev: ClipEditSettings) => ClipEditSettings),
  ) => void;
  onCaptureThumbnail: (captured: CapturedThumbnailResult, capturedAtSeconds: number) => void;
}

export function ClipVideoEditor({
  fileName,
  videoPreviewUrl,
  extractedMeta,
  editSettings,
  editEstimate,
  disabled = false,
  onChangeFileClick,
  onUpdateEditSettings,
  onCaptureThumbnail,
}: Readonly<ClipVideoEditorProps>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDraggingRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(editSettings.startTime);
  const [filmstripFrames, setFilmstripFrames] = useState<string[]>([]);
  const [isLoadingFilmstrip, setIsLoadingFilmstrip] = useState(false);
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    isDraggingRef.current = false;
    pendingSeekTimeRef.current = null;
    setCurrentTime(0);
    setIsPlaying(false);
    setCaptureError(null);
  }, [videoPreviewUrl]);

  useEffect(() => {
    const controller = new AbortController();
    setFilmstripFrames([]);
    setIsLoadingFilmstrip(true);

    void extractVideoFilmstripFrames(videoPreviewUrl, extractedMeta.durationSeconds, {
      frameCount: 10,
      signal: controller.signal,
    })
      .then((frames) => {
        if (!controller.signal.aborted) {
          setFilmstripFrames(frames);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingFilmstrip(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [videoPreviewUrl, extractedMeta.durationSeconds]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = editSettings.muteAudio;
    }
  }, [editSettings.muteAudio]);

  const getEffectiveDuration = (video: HTMLVideoElement | null): number => {
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      return video.duration;
    }
    return extractedMeta.durationSeconds;
  };

  const applySafeSeek = (rawTime: number) => {
    const video = videoRef.current;
    const clamped = clampSafeSeekTime(rawTime, getEffectiveDuration(video));
    setCurrentTime(clamped);

    if (!video) {
      return;
    }

    if (video.seeking) {
      pendingSeekTimeRef.current = clamped;
      return;
    }

    pendingSeekTimeRef.current = null;
    if (video.ended || Math.abs(video.currentTime - clamped) > 0.001) {
      video.currentTime = clamped;
    }
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    const pending = pendingSeekTimeRef.current;
    if (!video || pending === null) {
      return;
    }
    pendingSeekTimeRef.current = null;
    const clamped = clampSafeSeekTime(pending, getEffectiveDuration(video));
    setCurrentTime(clamped);
    if (!video.seeking && Math.abs(video.currentTime - clamped) > 0.001) {
      video.currentTime = clamped;
    }
  };

  const handleTimelineDragStart = () => {
    isDraggingRef.current = true;
    const video = videoRef.current;
    if (video && !video.paused && !video.ended) {
      video.pause();
    }
  };

  const handleTimelineDragEnd = () => {
    isDraggingRef.current = false;
    const video = videoRef.current;
    const pending = pendingSeekTimeRef.current;
    if (video && pending !== null && !video.seeking) {
      pendingSeekTimeRef.current = null;
      const clamped = clampSafeSeekTime(pending, getEffectiveDuration(video));
      setCurrentTime(clamped);
      if (Math.abs(video.currentTime - clamped) > 0.001) {
        video.currentTime = clamped;
      }
    }
  };

  const handleRewindToStart = () => {
    const video = videoRef.current;
    const safeStart = clampSafeSeekTime(editSettings.startTime, getEffectiveDuration(video));
    isDraggingRef.current = false;
    pendingSeekTimeRef.current = null;
    setCurrentTime(safeStart);
    if (!video) {
      return;
    }
    if (video.seeking) {
      video.pause();
    }
    video.currentTime = safeStart;
  };

  const handleTogglePlay = async () => {
    const video = videoRef.current;
    if (!video || disabled) {
      return;
    }

    if (video.paused || video.ended) {
      const effectiveDuration = getEffectiveDuration(video);
      const safeStart = clampSafeSeekTime(editSettings.startTime, effectiveDuration);
      const safeEnd = clampSafeSeekTime(editSettings.endTime, effectiveDuration);
      if (video.currentTime < safeStart || video.currentTime >= safeEnd) {
        applySafeSeek(safeStart);
      }
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (isDraggingRef.current) {
      return;
    }
    const video = videoRef.current;
    if (!video || video.seeking) {
      return;
    }
    const safeEnd = clampSafeSeekTime(editSettings.endTime, getEffectiveDuration(video));
    if (video.currentTime >= safeEnd) {
      applySafeSeek(editSettings.startTime);
      return;
    }
    setCurrentTime(video.currentTime);
  };

  const handleEnded = () => {
    if (isDraggingRef.current) {
      return;
    }
    setIsPlaying(false);
    applySafeSeek(editSettings.startTime);
  };

  const handleCaptureCurrentFrame = async () => {
    const video = videoRef.current;
    if (!video || disabled) {
      return;
    }
    setIsCapturingThumb(true);
    setCaptureError(null);
    try {
      const captured = await captureThumbnailFromVideoElement(video);
      const timestamp = Number.isFinite(video.currentTime) ? video.currentTime : currentTime;
      onCaptureThumbnail(captured, timestamp);
    } catch {
      setCaptureError('Não foi possível capturar o frame atual. Tente outro instante do vídeo.');
    } finally {
      setIsCapturingThumb(false);
    }
  };

  return (
    <div
      data-testid="clip-video-editor"
      className="overflow-hidden rounded-card border border-border-muted bg-bg-deep"
    >
      {/* Cabeçalho compacto do arquivo selecionado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-muted bg-bg-surface px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-mono text-mono-badge font-semibold text-text-primary">
            {fileName}
          </span>
          <span className="shrink-0 rounded-control border border-border-muted bg-bg-deep px-1.5 py-0.5 font-mono text-[10px] text-text-primary">
            {extractedMeta.resolutionLabel}
          </span>
          <span className="shrink-0 rounded-control border border-border-muted bg-bg-deep px-1.5 py-0.5 font-mono text-[10px] text-success">
            {formatFileSizeMb(extractedMeta.videoSizeBytes)}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onChangeFileClick}
          className="shrink-0 rounded-control border border-border-muted bg-bg-elevated px-2 py-1 font-mono text-[11px] text-text-secondary transition-colors hover:border-success hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-55"
        >
          Trocar arquivo
        </button>
      </div>

      {/* Player de preview 16:9 */}
      <div className="relative aspect-video max-h-[300px] w-full bg-bg-deep">
        <video
          ref={videoRef}
          src={videoPreviewUrl}
          playsInline
          preload="metadata"
          muted={editSettings.muteAudio}
          aria-label="Pré-visualização do editor de clipe"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onSeeked={handleSeeked}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          className="h-full w-full object-contain"
        >
          <track kind="captions" srcLang="pt-BR" label="Português" />
        </video>
      </div>

      {/* Barra unificada de controles do player + Mutar + Miniatura compacta + Capturar capa */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-muted bg-bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleTogglePlay()}
            aria-label={isPlaying ? 'Pausar prévia do corte' : 'Reproduzir prévia do corte'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-primary transition-colors hover:border-success hover:text-success disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={handleRewindToStart}
            aria-label="Voltar ao início do corte"
            title="Voltar ao início do corte"
            className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={editSettings.muteAudio}
            data-testid="toggle-mute-audio-btn"
            onClick={() => onUpdateEditSettings({ muteAudio: !editSettings.muteAudio })}
            className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2 font-mono text-mono-badge transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
              editSettings.muteAudio
                ? 'border-warning bg-bg-deep text-warning'
                : 'border-border-muted bg-bg-elevated text-text-secondary hover:border-text-secondary hover:text-text-primary'
            }`}
          >
            {editSettings.muteAudio ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{editSettings.muteAudio ? 'Áudio mutado' : 'Mutar áudio'}</span>
          </button>

          <span className="whitespace-nowrap pl-1 font-mono text-mono-badge text-text-secondary">
            {formatPreciseTime(currentTime)} / {formatPreciseTime(extractedMeta.durationSeconds)}
          </span>
        </div>

        {/* Miniatura compacta (w-16 h-9) + botão Usar frame como capa */}
        <div className="flex items-center gap-2">
          <div
            title={`Capa capturada em ${formatPreciseTime(editSettings.thumbnailTimeSeconds)}`}
            className="relative h-9 w-16 shrink-0 overflow-hidden rounded-[6px] border border-border-muted bg-bg-deep"
          >
            <img
              src={extractedMeta.thumbnailPreviewUrl}
              alt="Pré-visualização da capa gerada do clipe"
              className="h-full w-full object-cover"
            />
          </div>

          <button
            type="button"
            disabled={disabled || isCapturingThumb}
            data-testid="capture-thumbnail-frame-btn"
            onClick={() => void handleCaptureCurrentFrame()}
            className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border-muted bg-bg-elevated px-2.5 font-mono text-mono-badge font-medium text-text-primary transition-colors hover:border-success hover:text-success disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Camera className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            <span>{isCapturingThumb ? 'Capturando...' : 'Usar frame como capa'}</span>
          </button>
        </div>
      </div>

      {captureError && (
        <p
          role="alert"
          className="border-t border-danger bg-danger-surface px-3 py-1.5 font-mono text-mono-badge text-danger-text"
        >
          {captureError}
        </p>
      )}

      {/* Timeline interativa com filmstrip de 10 frames */}
      <ClipTrimTimeline
        totalDuration={extractedMeta.durationSeconds}
        startTime={editSettings.startTime}
        endTime={editSettings.endTime}
        currentTime={currentTime}
        filmstripFrames={filmstripFrames}
        isLoadingFilmstrip={isLoadingFilmstrip}
        disabled={disabled}
        onChangeRange={({ startTime, endTime }) => onUpdateEditSettings({ startTime, endTime })}
        onSeek={applySafeSeek}
        onDragStart={handleTimelineDragStart}
        onDragEnd={handleTimelineDragEnd}
      />

      {/* Seletor segmentado compacto (1 linha) + tamanho estimado */}
      <ClipExportControls
        preset={editSettings.preset}
        estimate={editEstimate}
        disabled={disabled}
        onChangePreset={(preset) => onUpdateEditSettings({ preset })}
      />
    </div>
  );
}
