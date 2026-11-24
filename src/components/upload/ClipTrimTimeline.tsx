'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { GripVertical, Scissors } from 'lucide-react';
import { MAX_DURATION_SECONDS } from '@/lib/validators';
import { clampTrimRange, formatPreciseTime } from '@/lib/video-editor-utils';

export type TrimDragMode = 'start' | 'end' | 'playhead';

export interface ClipTrimTimelineProps {
  totalDuration: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  filmstripFrames?: string[];
  isLoadingFilmstrip?: boolean;
  maxDuration?: number;
  disabled?: boolean;
  onChangeRange: (next: { startTime: number; endTime: number }) => void;
  onSeek: (timeSeconds: number) => void;
  onDragStart?: (mode: TrimDragMode) => void;
  onDragEnd?: (mode: TrimDragMode) => void;
}

const KEYBOARD_STEP_SECONDS = 1;
const SKELETON_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function ClipTrimTimeline({
  totalDuration,
  startTime,
  endTime,
  currentTime,
  filmstripFrames = [],
  isLoadingFilmstrip = false,
  maxDuration = MAX_DURATION_SECONDS,
  disabled = false,
  onChangeRange,
  onSeek,
  onDragStart,
  onDragEnd,
}: Readonly<ClipTrimTimelineProps>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeDragRef = useRef<TrimDragMode | null>(null);

  const safeTotal = Math.max(0.1, totalDuration);
  const startPct = Math.min(100, Math.max(0, (startTime / safeTotal) * 100));
  const endPct = Math.min(100, Math.max(startPct, (endTime / safeTotal) * 100));
  const playheadPct = Math.min(100, Math.max(0, (currentTime / safeTotal) * 100));
  const selectedDuration = Math.max(0, endTime - startTime);

  const resolveTimeFromClientX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || !Number.isFinite(clientX)) {
      return startTime;
    }
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * safeTotal;
  };

  const applyPointerTime = (mode: TrimDragMode, clientX: number) => {
    const nextTime = resolveTimeFromClientX(clientX);
    if (mode === 'playhead') {
      const clampedSeek = Math.min(endTime, Math.max(startTime, nextTime));
      onSeek(clampedSeek);
      return;
    }

    const nextRange = clampTrimRange({
      startTime: mode === 'start' ? nextTime : startTime,
      endTime: mode === 'end' ? nextTime : endTime,
      totalDuration: safeTotal,
      changedHandle: mode,
      maxDuration,
    });
    onChangeRange(nextRange);
    onSeek(mode === 'start' ? nextRange.startTime : nextRange.endTime);
  };

  const handleStartDrag = (mode: TrimDragMode) => (event: PointerEvent<HTMLElement>) => {
    if (disabled) {
      return;
    }
    event.stopPropagation();
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore in environments without active pointer capture
      }
    }
    if (activeDragRef.current !== mode) {
      activeDragRef.current = mode;
      onDragStart?.(mode);
    }
    applyPointerTime(mode, event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const activeMode = activeDragRef.current;
    if (!activeMode || disabled) {
      return;
    }
    applyPointerTime(activeMode, event.clientX);
  };

  const handlePointerUp = () => {
    const endedMode = activeDragRef.current;
    if (!endedMode) {
      return;
    }
    activeDragRef.current = null;
    onDragEnd?.(endedMode);
  };

  const handleHandleKeyDown =
    (handle: 'start' | 'end') => (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? KEYBOARD_STEP_SECONDS : -KEYBOARD_STEP_SECONDS;
      const nextRange = clampTrimRange({
        startTime: handle === 'start' ? startTime + delta : startTime,
        endTime: handle === 'end' ? endTime + delta : endTime,
        totalDuration: safeTotal,
        changedHandle: handle,
        maxDuration,
      });
      onChangeRange(nextRange);
      onSeek(handle === 'start' ? nextRange.startTime : nextRange.endTime);
    };

  return (
    <div className="space-y-2 border-t border-border-muted bg-bg-deep px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-mono-badge">
        <div className="flex items-center gap-2 text-text-secondary">
          <Scissors className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          <span data-testid="trim-start-label">Início: {formatPreciseTime(startTime)}</span>
          <span className="text-text-muted">•</span>
          <span data-testid="trim-end-label">Fim: {formatPreciseTime(endTime)}</span>
        </div>

        <span
          data-testid="trim-duration-badge"
          className="rounded-control border border-success/60 bg-bg-surface px-2 py-0.5 font-semibold text-success"
        >
          {formatPreciseTime(selectedDuration)} / máx {maxDuration}s
        </span>
      </div>

      {/* Trilho com Filmstrip contínuo (10 frames) + máscara escurecida fora do corte */}
      <div
        ref={trackRef}
        data-testid="clip-trim-track"
        onPointerDown={handleStartDrag('playhead')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative h-14 w-full select-none touch-none rounded-control border border-border-muted bg-bg-surface ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        {/* Camada do Filmstrip contínuo */}
        <div
          aria-hidden="true"
          data-testid="clip-trim-filmstrip"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-control"
        >
          {filmstripFrames.length > 0 ? (
            <div
              className="grid h-full w-full"
              style={{ gridTemplateColumns: `repeat(${filmstripFrames.length}, minmax(0, 1fr))` }}
            >
              {filmstripFrames.map((frameSrc, index) => (
                <img
                  key={`${index}-${frameSrc.slice(-12)}`}
                  src={frameSrc}
                  alt=""
                  draggable={false}
                  data-testid="filmstrip-frame"
                  className="h-full w-full object-cover"
                />
              ))}
            </div>
          ) : isLoadingFilmstrip ? (
            <div
              data-testid="filmstrip-skeleton"
              className="grid h-full w-full grid-cols-10 gap-px bg-bg-deep"
            >
              {SKELETON_SLOTS.map((slot) => (
                <div key={slot} className="h-full w-full animate-pulse bg-bg-elevated/70" />
              ))}
            </div>
          ) : (
            <div className="h-full w-full bg-bg-surface" />
          )}
        </div>

        {/* Regiões descartadas escurecidas fora de [startTime, endTime] */}
        <div
          aria-hidden="true"
          style={{ width: `${startPct}%` }}
          className="pointer-events-none absolute inset-y-0 left-0 rounded-l-control bg-bg-deep/80"
        />
        <div
          aria-hidden="true"
          style={{ width: `${Math.max(0, 100 - endPct)}%` }}
          className="pointer-events-none absolute inset-y-0 right-0 rounded-r-control bg-bg-deep/80"
        />

        {/* Moldura nítida #2EB886 envolvendo o trecho selecionado */}
        <div
          aria-hidden="true"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(0, endPct - startPct)}%`,
          }}
          className="pointer-events-none absolute inset-y-0 border-y-2 border-success shadow-[inset_0_0_0_1px_rgba(46,184,134,0.3)]"
        />

        {/* Agulha de tempo atual (playhead) */}
        <div
          aria-hidden="true"
          data-testid="trim-playhead"
          style={{ left: `${playheadPct}%` }}
          className="pointer-events-none absolute -top-1 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-warning shadow-[0_0_8px_rgba(232,176,75,0.85)]"
        >
          <span className="block h-2.5 w-2.5 -translate-x-[4px] rounded-full border border-bg-deep bg-warning" />
        </div>

        {/* Alça ergonômica de Início */}
        <button
          type="button"
          disabled={disabled}
          aria-label="Alça de início do corte"
          aria-valuemin={0}
          aria-valuemax={Math.round(endTime)}
          aria-valuenow={Math.round(startTime)}
          role="slider"
          data-testid="trim-handle-start"
          style={{ left: `${startPct}%` }}
          onPointerDown={handleStartDrag('start')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleHandleKeyDown('start')}
          className="absolute -bottom-[1px] -top-[1px] z-20 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-l-control bg-success text-bg-deep shadow-[0_2px_10px_rgba(2,10,18,0.85)] transition-colors hover:bg-success-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:cursor-not-allowed"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Alça ergonômica de Fim */}
        <button
          type="button"
          disabled={disabled}
          aria-label="Alça de fim do corte"
          aria-valuemin={Math.round(startTime)}
          aria-valuemax={Math.round(totalDuration)}
          aria-valuenow={Math.round(endTime)}
          role="slider"
          data-testid="trim-handle-end"
          style={{ left: `${endPct}%` }}
          onPointerDown={handleStartDrag('end')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleHandleKeyDown('end')}
          className="absolute -bottom-[1px] -top-[1px] z-20 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-r-control bg-success text-bg-deep shadow-[0_2px_10px_rgba(2,10,18,0.85)] transition-colors hover:bg-success-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:cursor-not-allowed"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {totalDuration > maxDuration && (
        <p className="font-mono text-mono-badge text-warning">
          Vídeo original excede {maxDuration}s — trecho ajustado automaticamente ao limite de envio.
        </p>
      )}
    </div>
  );
}
