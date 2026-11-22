import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClipTelemetry } from '@/hooks/useClipTelemetry';
import { analyticsService } from '@/services/analytics-service';

describe('useClipTelemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accumulates watched_seconds, marks decile buckets and dispatches milestones without duplicating', () => {
    const sendSpy = vi.spyOn(analyticsService, 'sendTelemetry').mockResolvedValue(null);

    const { result, unmount } = renderHook(() => useClipTelemetry('clip-1', 40));

    // Play start triggers milestone 0% once
    act(() => {
      result.current.onPlay(0);
      result.current.onPlay(0);
    });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenLastCalledWith(
      'clip-1',
      expect.objectContaining({
        max_progress_pct: 0,
        reached_buckets: [0],
      }),
      { keepalive: false },
    );

    // Gradual playback ticks up to 25% (10s of 40s)
    act(() => {
      result.current.onTimeUpdate(2, true, 40);
      result.current.onTimeUpdate(4, true, 40);
      result.current.onTimeUpdate(6, true, 40);
      result.current.onTimeUpdate(8, true, 40);
      result.current.onTimeUpdate(10, true, 40);
    });

    // Milestone 25% triggered once with buckets [0, 10, 20] and watched_seconds=10
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenLastCalledWith(
      'clip-1',
      expect.objectContaining({
        watched_seconds: 10,
        max_progress_pct: 25,
        reached_buckets: [0, 10, 20],
      }),
      { keepalive: false },
    );

    // Repeating same progress at 25% does NOT duplicate milestone send
    act(() => {
      result.current.onTimeUpdate(10.5, true, 40);
    });
    expect(sendSpy).toHaveBeenCalledTimes(2);

    // Seek forward to 50% (20s) -> does not inflate watched_seconds by 10s, triggers milestone 50%
    act(() => {
      result.current.onSeek(20);
      result.current.onTimeUpdate(20, true, 40);
    });
    expect(sendSpy).toHaveBeenCalledTimes(3);
    expect(sendSpy).toHaveBeenLastCalledWith(
      'clip-1',
      expect.objectContaining({
        watched_seconds: 10.5,
        max_progress_pct: 50,
        reached_buckets: [0, 10, 20, 50],
      }),
      { keepalive: false },
    );

    // Pause flushes current state if changed
    act(() => {
      result.current.onTimeUpdate(22, true, 40);
      result.current.onPause();
    });
    expect(sendSpy).toHaveBeenCalledTimes(4);
    expect(sendSpy).toHaveBeenLastCalledWith(
      'clip-1',
      expect.objectContaining({
        watched_seconds: 12.5,
        max_progress_pct: 55,
      }),
      { keepalive: false },
    );

    // Ended marks 100% bucket and flushes
    act(() => {
      result.current.onEnded(40);
    });
    expect(sendSpy).toHaveBeenCalledTimes(5);
    expect(sendSpy).toHaveBeenLastCalledWith(
      'clip-1',
      expect.objectContaining({
        max_progress_pct: 100,
        reached_buckets: expect.arrayContaining([0, 10, 20, 50, 100]),
      }),
      { keepalive: false },
    );

    unmount();
  });

  it('flushes with keepalive: true on visibilitychange hidden and resets session_token on clipId change', () => {
    const sendSpy = vi.spyOn(analyticsService, 'sendTelemetry').mockResolvedValue(null);

    const { result, rerender } = renderHook(
      ({ clipId }: { clipId: string }) => useClipTelemetry(clipId, 20),
      { initialProps: { clipId: 'clip-a' } },
    );

    act(() => {
      result.current.onPlay(0);
      result.current.onTimeUpdate(2, true, 20);
    });
    const firstToken = sendSpy.mock.calls[0]?.[1].session_token;

    // Simulate switching browser tab (visibilityState = hidden)
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(sendSpy).toHaveBeenLastCalledWith(
      'clip-a',
      expect.objectContaining({
        session_token: firstToken,
        watched_seconds: 2,
      }),
      { keepalive: true },
    );

    // Restore visibilityState and switch to another clip
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    rerender({ clipId: 'clip-b' });

    act(() => {
      result.current.onPlay(0);
    });

    const lastCall = sendSpy.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('clip-b');
    expect(lastCall?.[1].session_token).not.toBe(firstToken);
  });
});
