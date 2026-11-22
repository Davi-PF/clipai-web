import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/lib/api-client';
import { analyticsService } from '@/services/analytics-service';
import {
  formatPercentage,
  formatShortDatePtBr,
  formatWatchTime,
  getRetentionTone,
} from '@/types/analytics';

describe('analytics-service & formatting helpers', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('creator_jwt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('fetches overview, creator clips with query params, and clip retention', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            period: '7d',
            total_clips: 4,
            total_views: 520,
            total_likes: 88,
            total_favorites: 19,
            total_watch_time_seconds: 5400,
            avg_retention_pct: 72.5,
            completion_rate_pct: 58.0,
            total_sessions: 140,
            views_by_day: [{ date: '2026-11-22', sessions: 20, watch_time_seconds: 600 }],
            by_game: [],
            top_clips: [],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            page_size: 10,
            total: 0,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            clip_id: 'clip-1',
            slug: 'clutch-1',
            title: 'Clutch 1v4',
            duration_seconds: 34,
            period: '7d',
            total_sessions: 20,
            avg_watch_seconds: 25,
            avg_retention_pct: 74,
            completion_rate_pct: 60,
            biggest_drop_bucket_pct: 40,
            views_by_day: [],
            curve: [{ bucket_pct: 0, retention_pct: 100, sessions: 20 }],
          }),
          { status: 200 },
        ),
      );

    const overview = await analyticsService.getOverview('7d');
    expect(overview.total_views).toBe(520);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/analytics/overview?period=7d');

    const clips = await analyticsService.listCreatorClips({
      q: 'clutch',
      privacy: 'public',
      game_id: 'g-cs2',
      period: '7d',
      sort: 'retention',
      page: 2,
      page_size: 10,
    });
    expect(clips.items).toEqual([]);
    const clipsUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(clipsUrl).toContain('q=clutch');
    expect(clipsUrl).toContain('privacy=public');
    expect(clipsUrl).toContain('sort=retention');

    const retention = await analyticsService.getClipRetention('clip-1', '7d');
    expect(retention.biggest_drop_bucket_pct).toBe(40);
  });

  it('sends telemetry in normal and keepalive modes and swallows network failures silently', async () => {
    const payload = {
      session_token: '8d7a6f30-5a4c-4c3b-9b7a-1c2d3e4f5a6b',
      watched_seconds: 15,
      max_progress_pct: 50,
      reached_buckets: [0, 10, 20, 30, 40, 50],
    };

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session_id: 's1',
            clip_id: 'clip-1',
            ...payload,
            completed: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session_id: 's1',
            clip_id: 'clip-1',
            ...payload,
            completed: false,
          }),
          { status: 200 },
        ),
      )
      .mockRejectedValueOnce(new Error('Offline'));

    const normalRes = await analyticsService.sendTelemetry('clip-1', payload);
    expect(normalRes?.session_id).toBe('s1');

    const keepaliveRes = await analyticsService.sendTelemetry('clip-1', payload, {
      keepalive: true,
    });
    expect(keepaliveRes?.session_id).toBe('s1');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ keepalive: true });

    const failedRes = await analyticsService.sendTelemetry('clip-1', payload, { keepalive: true });
    expect(failedRes).toBeNull();
  });

  it('formats retention tones, watch time, percentages and dates', () => {
    expect(getRetentionTone(65)).toBe('high');
    expect(getRetentionTone(45)).toBe('medium');
    expect(getRetentionTone(20)).toBe('low');

    expect(formatWatchTime(0)).toBe('0m');
    expect(formatWatchTime(45)).toBe('45s');
    expect(formatWatchTime(720)).toBe('12m');
    expect(formatWatchTime(14_250)).toBe('3h 57m');

    expect(formatShortDatePtBr('2026-11-22')).toBe('22/11');
    expect(formatShortDatePtBr('invalid')).toBe('invalid');

    expect(formatPercentage(74.2)).toBe('74.2%');
    expect(formatPercentage(60.0)).toBe('60%');
    expect(formatPercentage(-1)).toBe('0%');
  });
});
