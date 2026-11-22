import type { ClipStatus, PrivacyLevel } from '@/types/api';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export type AnalyticsClipSort = 'views' | 'retention' | 'likes' | 'recent';

export interface ViewsByDayPoint {
  date: string;
  sessions: number;
  watch_time_seconds: number;
}

export interface GameAnalyticsSummary {
  game_id: string;
  game_name: string;
  clips_count: number;
  total_views: number;
  avg_retention_pct: number;
}

export interface TopClipAnalyticsItem {
  id: string;
  slug: string;
  title: string;
  thumbnail_url: string;
  game_name: string;
  views_count: number;
  likes_count: number;
  avg_retention_pct: number;
  completion_rate_pct: number;
}

export interface AnalyticsOverviewResponse {
  period: AnalyticsPeriod;
  total_clips: number;
  total_views: number;
  total_likes: number;
  total_favorites: number;
  total_watch_time_seconds: number;
  avg_retention_pct: number;
  completion_rate_pct: number;
  total_sessions: number;
  views_by_day: ViewsByDayPoint[];
  by_game: GameAnalyticsSummary[];
  top_clips: TopClipAnalyticsItem[];
}

export interface CreatorClipAnalyticsItem {
  id: string;
  slug: string;
  title: string;
  privacy: PrivacyLevel;
  status: ClipStatus;
  thumbnail_url: string;
  duration_seconds: number;
  game_id: string;
  game_name: string;
  views_count: number;
  likes_count: number;
  favorites_count: number;
  sessions_count: number;
  avg_retention_pct: number;
  completion_rate_pct: number;
  created_at: string;
}

export interface RetentionCurvePoint {
  bucket_pct: number;
  retention_pct: number;
  sessions: number;
}

export interface ClipRetentionResponse {
  clip_id: string;
  slug: string;
  title: string;
  duration_seconds: number;
  period: AnalyticsPeriod;
  total_sessions: number;
  avg_watch_seconds: number;
  avg_retention_pct: number;
  completion_rate_pct: number;
  biggest_drop_bucket_pct: number | null;
  views_by_day: ViewsByDayPoint[];
  curve: RetentionCurvePoint[];
}

export interface ClipTelemetryRequest {
  session_token: string;
  watched_seconds: number;
  max_progress_pct: number;
  reached_buckets: number[];
}

export interface ClipTelemetryResponse {
  session_id: string;
  clip_id: string;
  session_token: string;
  watched_seconds: number;
  max_progress_pct: number;
  reached_buckets: number[];
  completed: boolean;
}

export interface ListAnalyticsClipsParams {
  q?: string;
  privacy?: PrivacyLevel;
  game_id?: string;
  period?: AnalyticsPeriod;
  sort?: AnalyticsClipSort;
  page?: number;
  page_size?: number;
}

export type RetentionTone = 'high' | 'medium' | 'low';

export function getRetentionTone(retentionPct: number): RetentionTone {
  if (retentionPct >= 60) {
    return 'high';
  }
  if (retentionPct >= 35) {
    return 'medium';
  }
  return 'low';
}

export function formatWatchTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }
  const roundedMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${Math.round(totalSeconds)}s`;
}

export function formatShortDatePtBr(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoDate;
}

export function formatPercentage(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0%';
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}
