'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { formatDurationBadge } from '@/lib/validators';

export interface ClipPlayerProps {
  src: string;
  poster?: string;
  title: string;
  initialDuration?: number;
  resolutionLabel?: string;
  borderless?: boolean;
  onPlayStart?: () => void;
  onQualifiedView?: () => void;
}

export function ClipPlayer({
  src,
  poster,
  title,
  initialDuration = 0,
  resolutionLabel,
  borderless = false,
  onPlayStart,
  onQualifiedView,
}: Readonly<ClipPlayerProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasReportedViewRef = useRef(false);
  const hasReportedPlayStartRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    hasReportedViewRef.current = false;
    hasReportedPlayStartRef.current = false;
    setCurrentTime(0);
    setIsPlaying(false);
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (typeof container.requestFullscreen === 'function') {
      await container.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    const effectiveDuration =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
    const threshold = effectiveDuration > 0 ? Math.min(3, effectiveDuration * 0.25) : 3;
    if (!hasReportedViewRef.current && video.currentTime >= threshold) {
      hasReportedViewRef.current = true;
      onQualifiedView?.();
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const frameClasses = borderless
    ? 'group relative aspect-video w-full overflow-hidden bg-bg-deep'
    : 'group relative aspect-video w-full overflow-hidden rounded-bento border-[1.5px] border-border-muted bg-bg-deep';

  return (
    <div ref={containerRef} className={frameClasses}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        aria-label={`Player de vídeo: ${title}`}
        onClick={() => void togglePlay()}
        onPlay={() => {
          setIsPlaying(true);
          if (!hasReportedPlayStartRef.current) {
            hasReportedPlayStartRef.current = true;
            onPlayStart?.();
          }
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (video && Number.isFinite(video.duration) && video.duration > 0) {
            setDuration(video.duration);
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full cursor-pointer object-contain"
      />

      {resolutionLabel && (
        <span className="pointer-events-none absolute right-3 top-3 rounded-control border border-border-muted bg-bg-deep/85 px-2 py-0.5 font-mono text-mono-badge uppercase text-text-primary">
          {resolutionLabel}
        </span>
      )}

      {isBuffering && (
        <div
          aria-label="Carregando vídeo"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg-deep/50"
        >
          <Loader2 className="h-10 w-10 animate-spin text-success" aria-hidden="true" />
        </div>
      )}

      {!isPlaying && !isBuffering && (
        <button
          type="button"
          onClick={() => void togglePlay()}
          aria-label="Reproduzir vídeo"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-success bg-bg-surface/90 text-success transition-transform hover:scale-105 hover:bg-success hover:text-bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
        </button>
      )}

      {/* Barra de controles inferiores */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-bg-deep/90 px-4 py-3 backdrop-blur-sm">
        <div className="relative flex items-center">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-surface">
            <div className="h-full bg-success" style={{ width: `${progressPercent}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Barra de progresso do vídeo"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="rounded-control p-1.5 text-text-primary transition-colors hover:bg-bg-surface hover:text-success"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
                className="rounded-control p-1.5 text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Controle de volume"
                className="hidden h-1 w-20 cursor-pointer accent-success sm:block"
              />
            </div>

            <span className="font-mono text-mono-meta text-text-secondary">
              {formatDurationBadge(currentTime)} / {formatDurationBadge(duration)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="rounded-control p-1.5 text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
