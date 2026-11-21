'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { fetchApiHealth } from '@/services/health.service';
import type { HealthCheckResponse } from '@/types/api';

export type HealthConnectionState = 'checking' | 'online' | 'offline';

export interface UseApiHealthResult {
  connectionState: HealthConnectionState;
  healthData: HealthCheckResponse | null;
  errorMessage: string | null;
  recheck: () => Promise<void>;
}

export function useApiHealth(): UseApiHealthResult {
  const [connectionState, setConnectionState] = useState<HealthConnectionState>('checking');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recheck = useCallback(async () => {
    setConnectionState('checking');
    setErrorMessage(null);

    try {
      const response = await fetchApiHealth();
      setHealthData(response);
      setConnectionState('online');
    } catch (error: unknown) {
      setHealthData(null);
      setConnectionState('offline');
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Não foi possível conectar ao endpoint /api/v1/health.');
      }
    }
  }, []);

  useEffect(() => {
    void recheck();
  }, [recheck]);

  return {
    connectionState,
    healthData,
    errorMessage,
    recheck,
  };
}
