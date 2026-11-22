'use client';

import { useCallback, useEffect, useRef } from 'react';
import { analyticsService } from '@/services/analytics-service';
import type { ClipTelemetryRequest } from '@/types/analytics';

const TELEMETRY_MILESTONES = [0, 25, 50, 75, 100] as const;
const MAX_PLAYBACK_DELTA_SECONDS = 2.5;

function generateSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return '00000000-0000-4000-8000-000000000000';
}

export interface ClipTelemetryHandlers {
  onPlay: (currentTime: number) => void;
  onTimeUpdate: (currentTime: number, isPlaying: boolean, runtimeDuration?: number) => void;
  onPause: () => void;
  onEnded: (runtimeDuration?: number) => void;
  onSeek: (nextTime: number) => void;
  flush: (useKeepalive?: boolean) => void;
}

export function useClipTelemetry(
  clipId: string | undefined,
  durationSeconds: number,
): ClipTelemetryHandlers {
  const clipIdRef = useRef<string | undefined>(clipId);
  const durationRef = useRef<number>(durationSeconds);
  durationRef.current = durationSeconds;

  const sessionTokenRef = useRef<string>(generateSessionToken());
  const watchedSecondsRef = useRef<number>(0);
  const lastObservedTimeRef = useRef<number | null>(null);
  const maxProgressPctRef = useRef<number>(0);
  const reachedBucketsRef = useRef<Set<number>>(new Set());
  const sentMilestonesRef = useRef<Set<number>>(new Set());
  const hasStartedPlaybackRef = useRef<boolean>(false);
  const lastSentSignatureRef = useRef<string>('');

  const buildPayload = useCallback((): ClipTelemetryRequest => {
    const sortedBuckets = Array.from(reachedBucketsRef.current).sort((a, b) => a - b);
    return {
      session_token: sessionTokenRef.current,
      watched_seconds: Math.round(watchedSecondsRef.current * 100) / 100,
      max_progress_pct: maxProgressPctRef.current,
      reached_buckets: sortedBuckets.length > 0 ? sortedBuckets : [0],
    };
  }, []);

  const flush = useCallback(
    (useKeepalive = false) => {
      const activeClipId = clipIdRef.current;
      if (!activeClipId || !hasStartedPlaybackRef.current) {
        return;
      }

      const payload = buildPayload();
      const signature = `${activeClipId}:${payload.session_token}:${payload.watched_seconds}:${payload.max_progress_pct}:${payload.reached_buckets.join(',')}`;
      if (signature === lastSentSignatureRef.current) {
        return;
      }
      lastSentSignatureRef.current = signature;

      void analyticsService.sendTelemetry(activeClipId, payload, { keepalive: useKeepalive });
    },
    [buildPayload],
  );

  // Reset telemetry state cleanly whenever clipId changes, flushing previous session first
  useEffect(() => {
    if (clipIdRef.current && clipIdRef.current !== clipId && hasStartedPlaybackRef.current) {
      flush(true);
    }

    clipIdRef.current = clipId;
    sessionTokenRef.current = generateSessionToken();
    watchedSecondsRef.current = 0;
    lastObservedTimeRef.current = null;
    maxProgressPctRef.current = 0;
    reachedBucketsRef.current = new Set();
    sentMilestonesRef.current = new Set();
    hasStartedPlaybackRef.current = false;
    lastSentSignatureRef.current = '';
  }, [clipId, flush]);

  // Flush on page hide / tab switch and component unmount
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flush(true);
    };
  }, [flush]);

  const onPlay = useCallback(
    (currentTime: number) => {
      if (!clipIdRef.current) {
        return;
      }
      hasStartedPlaybackRef.current = true;
      lastObservedTimeRef.current = currentTime;
      reachedBucketsRef.current.add(0);

      if (!sentMilestonesRef.current.has(0)) {
        sentMilestonesRef.current.add(0);
        flush(false);
      }
    },
    [flush],
  );

  const onTimeUpdate = useCallback(
    (currentTime: number, isPlaying: boolean, runtimeDuration?: number) => {
      if (!clipIdRef.current || !isPlaying) {
        lastObservedTimeRef.current = null;
        return;
      }

      const effectiveDuration =
        runtimeDuration && Number.isFinite(runtimeDuration) && runtimeDuration > 0
          ? runtimeDuration
          : durationRef.current;

      if (!Number.isFinite(effectiveDuration) || effectiveDuration <= 0) {
        return;
      }

      hasStartedPlaybackRef.current = true;

      if (lastObservedTimeRef.current !== null) {
        const delta = currentTime - lastObservedTimeRef.current;
        if (delta > 0 && delta <= MAX_PLAYBACK_DELTA_SECONDS) {
          watchedSecondsRef.current += delta;
        }
      }
      lastObservedTimeRef.current = currentTime;

      const pct = Math.min(100, Math.max(0, Math.round((currentTime / effectiveDuration) * 100)));
      if (pct > maxProgressPctRef.current) {
        maxProgressPctRef.current = pct;
      }

      reachedBucketsRef.current.add(0);
      const decile = Math.min(100, Math.floor(pct / 10) * 10);
      reachedBucketsRef.current.add(decile);

      let reachedNewMilestone = false;
      for (const milestone of TELEMETRY_MILESTONES) {
        if (pct >= milestone && !sentMilestonesRef.current.has(milestone)) {
          sentMilestonesRef.current.add(milestone);
          reachedNewMilestone = true;
        }
      }

      if (reachedNewMilestone) {
        flush(false);
      }
    },
    [flush],
  );

  const onPause = useCallback(() => {
    lastObservedTimeRef.current = null;
    flush(false);
  }, [flush]);

  const onEnded = useCallback(
    (runtimeDuration?: number) => {
      if (!clipIdRef.current) {
        return;
      }
      hasStartedPlaybackRef.current = true;

      const effectiveDuration =
        runtimeDuration && Number.isFinite(runtimeDuration) && runtimeDuration > 0
          ? runtimeDuration
          : durationRef.current;

      if (
        lastObservedTimeRef.current !== null &&
        Number.isFinite(effectiveDuration) &&
        effectiveDuration > 0
      ) {
        const remaining = effectiveDuration - lastObservedTimeRef.current;
        if (remaining > 0 && remaining <= MAX_PLAYBACK_DELTA_SECONDS) {
          watchedSecondsRef.current += remaining;
        }
      }

      lastObservedTimeRef.current = null;
      maxProgressPctRef.current = 100;
      reachedBucketsRef.current.add(0);
      reachedBucketsRef.current.add(100);
      sentMilestonesRef.current.add(100);
      flush(false);
    },
    [flush],
  );

  const onSeek = useCallback((nextTime: number) => {
    lastObservedTimeRef.current = nextTime;
  }, []);

  return {
    onPlay,
    onTimeUpdate,
    onPause,
    onEnded,
    onSeek,
    flush,
  };
}
