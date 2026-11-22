'use client';

import { Activity, CheckCircle2, Clock, Eye, Heart } from 'lucide-react';
import {
  formatPercentage,
  formatWatchTime,
  getRetentionTone,
  type AnalyticsOverviewResponse,
  type RetentionTone,
} from '@/types/analytics';

export interface StudioKpiGridProps {
  overview: AnalyticsOverviewResponse | null;
  isLoading: boolean;
}

const RETENTION_TONE_TEXT: Record<RetentionTone, string> = {
  high: 'text-success',
  medium: 'text-warning',
  low: 'text-danger-text',
};

const RETENTION_TONE_LABEL: Record<RetentionTone, string> = {
  high: 'Excelente retenção',
  medium: 'Retenção moderada',
  low: 'Queda acentuada',
};

export function StudioKpiGrid({ overview, isLoading }: Readonly<StudioKpiGridProps>) {
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Carregando métricas principais"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
          />
        ))}
      </section>
    );
  }

  const totalViews = overview?.total_views ?? 0;
  const totalClips = overview?.total_clips ?? 0;
  const avgRetention = overview?.avg_retention_pct ?? 0;
  const completionRate = overview?.completion_rate_pct ?? 0;
  const totalLikes = overview?.total_likes ?? 0;
  const totalFavorites = overview?.total_favorites ?? 0;
  const totalWatchSeconds = overview?.total_watch_time_seconds ?? 0;
  const totalSessions = overview?.total_sessions ?? 0;

  const retentionTone = getRetentionTone(avgRetention);

  return (
    <section
      aria-label="Indicadores principais do criador"
      data-testid="studio-kpi-grid"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* KPI 1: Visualizações Totais */}
      <article
        data-testid="kpi-total-views"
        className="flex flex-col justify-between rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-mono-badge uppercase text-text-secondary">
            VISUALIZAÇÕES TOTAIS
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-deep">
            <Eye className="h-4 w-4 text-text-primary" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 space-y-1">
          <p className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
            {totalViews.toLocaleString('pt-BR')}
          </p>
          <p className="font-mono text-mono-badge text-text-muted">
            {totalClips} {totalClips === 1 ? 'clipe publicado' : 'clipes publicados'}
          </p>
        </div>
      </article>

      {/* KPI 2: Retenção Média */}
      <article
        data-testid="kpi-avg-retention"
        className="flex flex-col justify-between rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-mono-badge uppercase text-text-secondary">
            RETENÇÃO MÉDIA
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-deep">
            <Activity
              className={`h-4 w-4 ${RETENTION_TONE_TEXT[retentionTone]}`}
              aria-hidden="true"
            />
          </span>
        </div>
        <div className="mt-3 space-y-1">
          <p
            data-testid="kpi-avg-retention-value"
            data-tone={retentionTone}
            className={`font-display text-display-hero uppercase tracking-[0.06em] ${RETENTION_TONE_TEXT[retentionTone]}`}
          >
            {formatPercentage(avgRetention)}
          </p>
          <p className="font-mono text-mono-badge text-text-muted">
            {totalSessions > 0
              ? `${RETENTION_TONE_LABEL[retentionTone]} • ${totalSessions} sessões`
              : 'Sem sessões no período'}
          </p>
        </div>
      </article>

      {/* KPI 3: Taxa de Conclusão */}
      <article
        data-testid="kpi-completion-rate"
        className="flex flex-col justify-between rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-mono-badge uppercase text-text-secondary">
            TAXA DE CONCLUSÃO
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-deep">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 space-y-1">
          <p className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
            {formatPercentage(completionRate)}
          </p>
          <p className="font-mono text-mono-badge text-text-muted">Assistiram até o fim</p>
        </div>
      </article>

      {/* KPI 4: Engajamento / Tempo Assistido */}
      <article
        data-testid="kpi-engagement-watchtime"
        className="flex flex-col justify-between rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-mono-badge uppercase text-text-secondary">
            ENGAJAMENTO / TEMPO
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-deep">
            <Clock className="h-4 w-4 text-warning" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 space-y-1">
          <p className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
            {formatWatchTime(totalWatchSeconds)}
          </p>
          <p className="flex items-center gap-2 font-mono text-mono-badge text-text-muted">
            <span className="inline-flex items-center gap-1 text-danger-text">
              <Heart className="h-3 w-3 fill-current" aria-hidden="true" />
              {totalLikes.toLocaleString('pt-BR')} curtidas
            </span>
            <span>•</span>
            <span>{totalFavorites} favs</span>
          </p>
        </div>
      </article>
    </section>
  );
}
