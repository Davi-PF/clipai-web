import { apiClient, getAccessToken, resolveApiUrl } from '@/lib/api-client';
import type {
  AnalyticsOverviewResponse,
  AnalyticsPeriod,
  ClipRetentionResponse,
  ClipTelemetryRequest,
  ClipTelemetryResponse,
  CreatorClipAnalyticsItem,
  ListAnalyticsClipsParams,
} from '@/types/analytics';
import type { PaginatedResponse } from '@/types/api';

function buildAnalyticsClipsQuery(params: ListAnalyticsClipsParams = {}): string {
  const search = new URLSearchParams();
  if (params.q && params.q.trim().length > 0) {
    search.set('q', params.q.trim());
  }
  if (params.privacy) {
    search.set('privacy', params.privacy);
  }
  if (params.game_id) {
    search.set('game_id', params.game_id);
  }
  if (params.period) {
    search.set('period', params.period);
  }
  if (params.sort) {
    search.set('sort', params.sort);
  }
  if (typeof params.page === 'number') {
    search.set('page', String(params.page));
  }
  if (typeof params.page_size === 'number') {
    search.set('page_size', String(params.page_size));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const analyticsService = {
  async getOverview(period: AnalyticsPeriod = '30d'): Promise<AnalyticsOverviewResponse> {
    return apiClient.get<AnalyticsOverviewResponse>(
      `/api/v1/analytics/overview?period=${encodeURIComponent(period)}`,
    );
  },

  async listCreatorClips(
    params: ListAnalyticsClipsParams = {},
  ): Promise<PaginatedResponse<CreatorClipAnalyticsItem>> {
    const qs = buildAnalyticsClipsQuery(params);
    return apiClient.get<PaginatedResponse<CreatorClipAnalyticsItem>>(
      `/api/v1/analytics/clips${qs}`,
    );
  },

  async getClipRetention(
    clipId: string,
    period: AnalyticsPeriod = '30d',
  ): Promise<ClipRetentionResponse> {
    const safeId = encodeURIComponent(clipId);
    return apiClient.get<ClipRetentionResponse>(
      `/api/v1/analytics/clips/${safeId}/retention?period=${encodeURIComponent(period)}`,
    );
  },

  async sendTelemetry(
    clipId: string,
    payload: ClipTelemetryRequest,
    options: { keepalive?: boolean } = {},
  ): Promise<ClipTelemetryResponse | null> {
    const safeId = encodeURIComponent(clipId);
    const path = `/api/v1/clips/${safeId}/telemetry`;

    if (options.keepalive) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      const token = getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        const response = await fetch(resolveApiUrl(path), {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include',
          keepalive: true,
        });
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as ClipTelemetryResponse;
      } catch {
        return null;
      }
    }

    try {
      return await apiClient.post<ClipTelemetryResponse>(path, payload, {
        skipRefresh: !getAccessToken(),
      });
    } catch {
      return null;
    }
  },
};
