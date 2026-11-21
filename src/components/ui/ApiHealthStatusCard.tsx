'use client';

import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useApiHealth } from '@/hooks/useApiHealth';
import { getApiBaseUrl } from '@/lib/api-client';

export function ApiHealthStatusCard() {
  const { connectionState, healthData, errorMessage, recheck } = useApiHealth();
  const apiBaseUrl = getApiBaseUrl();

  return (
    <section
      aria-label="Diagnóstico de conexão com a API"
      className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-text-primary" aria-hidden="true" />
            <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              STATUS DE CONEXÃO COM A API (/API/V1/HEALTH)
            </h2>
          </div>
          <p className="font-mono text-mono-meta text-text-secondary">
            Endpoint monitorado:{' '}
            <code className="rounded-control bg-bg-deep px-2 py-0.5 text-text-primary">
              {apiBaseUrl}/health
            </code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {connectionState === 'checking' && (
            <span
              data-testid="health-badge-checking"
              className="inline-flex items-center gap-2 rounded-control border border-warning bg-bg-elevated px-3 py-1.5 font-mono text-mono-badge uppercase text-warning"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              VERIFICANDO CONEXÃO...
            </span>
          )}

          {connectionState === 'online' && (
            <span
              data-testid="health-badge-online"
              className="inline-flex items-center gap-2 rounded-control border border-success bg-success-surface px-3 py-1.5 font-mono text-mono-badge uppercase text-text-primary"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              API ONLINE • {healthData?.status.toUpperCase()}
            </span>
          )}

          {connectionState === 'offline' && (
            <span
              data-testid="health-badge-offline"
              className="inline-flex items-center gap-2 rounded-control border border-danger bg-danger-surface px-3 py-1.5 font-mono text-mono-badge uppercase text-danger-text"
            >
              <AlertCircle className="h-3.5 w-3.5 text-danger-text" aria-hidden="true" />
              API OFFLINE / INACESSÍVEL
            </span>
          )}

          <button
            type="button"
            onClick={() => void recheck()}
            disabled={connectionState === 'checking'}
            className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-4 py-2 font-display text-display-cta uppercase tracking-[0.06em] text-text-primary transition-colors hover:border-success hover:bg-success-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            TESTAR CONEXÃO
          </button>
        </div>
      </div>

      {connectionState === 'online' && healthData && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border-muted pt-4 sm:grid-cols-3">
          <div className="rounded-card bg-bg-deep p-3">
            <span className="block font-mono text-mono-badge uppercase text-text-muted">
              STATUS DO SERVIÇO
            </span>
            <span className="mt-1 block font-mono text-mono-body font-semibold text-success">
              {healthData.status}
            </span>
          </div>
          <div className="rounded-card bg-bg-deep p-3">
            <span className="block font-mono text-mono-badge uppercase text-text-muted">
              VERSÃO DA API
            </span>
            <span className="mt-1 block font-mono text-mono-body font-semibold text-text-primary">
              v{healthData.version}
            </span>
          </div>
          <div className="rounded-card bg-bg-deep p-3">
            <span className="block font-mono text-mono-badge uppercase text-text-muted">
              POSTGRESQL
            </span>
            <span className="mt-1 block font-mono text-mono-body font-semibold text-success">
              {healthData.database}
            </span>
          </div>
        </div>
      )}

      {connectionState === 'offline' && errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
        >
          {errorMessage}
        </div>
      )}
    </section>
  );
}
