import { apiClient } from '@/lib/api-client';
import type { HealthCheckResponse } from '@/types/api';

export async function fetchApiHealth(): Promise<HealthCheckResponse> {
  return apiClient.get<HealthCheckResponse>('/api/v1/health', {
    skipAuth: true,
    skipRefresh: true,
  });
}
