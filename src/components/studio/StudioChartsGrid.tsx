'use client';

import { Activity, AlertTriangle, BarChart3, Clock, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationBadge } from '@/lib/validators';
import {
  formatPercentage,
  formatShortDatePtBr,
  formatWatchTime,
  type ClipRetentionResponse,
  type ViewsByDayPoint,
} from '@/types/analytics';

interface ChartTooltipPayloadItem<T> {
  payload?: T;
}

interface CustomTooltipProps<T> {
  active?: boolean;
  payload?: ChartTooltipPayloadItem<T>[];
}

function ViewsTooltip({ active, payload }: Readonly<CustomTooltipProps<ViewsByDayPoint>>) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-card border border-border-muted bg-bg-surface px-3 py-2 font-mono text-mono-meta shadow-lg">
      <p className="font-semibold text-text-primary">{formatShortDatePtBr(point.date)}</p>
      <p className="mt-1 text-success">
        {point.sessions} {point.sessions === 1 ? 'sessão' : 'sessões'}
      </p>
      <p className="text-text-secondary">
        Tempo assistido: {formatWatchTime(point.watch_time_seconds)}
      </p>
    </div>
  );
}

interface RetentionPointView {
  bucket_pct: number;
  bucket_label: string;
  retention_pct: number;
  sessions: number;
}

function RetentionTooltip({ active, payload }: Readonly<CustomTooltipProps<RetentionPointView>>) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-card border border-border-muted bg-bg-surface px-3 py-2 font-mono text-mono-meta shadow-lg">
      <p className="font-semibold text-text-primary">Trecho: {point.bucket_label}</p>
      <p className="mt-1 text-success">Retenção: {formatPercentage(point.retention_pct)}</p>
      <p className="text-text-secondary">
        {point.sessions} {point.sessions === 1 ? 'espectador ativo' : 'espectadores ativos'}
      </p>
    </div>
  );
}

export interface StudioChartsGridProps {
  viewsByDay: ViewsByDayPoint[];
  isLoadingOverview: boolean;
  retention: ClipRetentionResponse | null;
  isLoadingRetention: boolean;
}

export function StudioChartsGrid({
  viewsByDay,
  isLoadingOverview,
  retention,
  isLoadingRetention,
}: Readonly<StudioChartsGridProps>) {
  const hasViewsActivity = viewsByDay.some((point) => point.sessions > 0);
  const viewsChartData = viewsByDay.map((point) => ({
    ...point,
    date_label: formatShortDatePtBr(point.date),
  }));

  const retentionChartData: RetentionPointView[] = (retention?.curve ?? []).map((point) => ({
    ...point,
    bucket_label: `${point.bucket_pct}%`,
  }));

  return (
    <section
      aria-label="Gráficos de visualizações e retenção"
      className="grid grid-cols-1 gap-4 xl:grid-cols-2"
    >
      {/* Card 1: Evolução de Visualizações */}
      <article
        data-testid="studio-views-chart-card"
        className="flex flex-col rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
      >
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-border-muted pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
              <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                EVOLUÇÃO DE VISUALIZAÇÕES
              </h2>
            </div>
            <p className="mt-0.5 font-mono text-mono-meta text-text-secondary">
              Sessões diárias registradas nos seus clipes durante o período selecionado.
            </p>
          </div>
        </header>

        {isLoadingOverview ? (
          <div
            aria-busy="true"
            className="h-[260px] w-full animate-pulse rounded-card bg-bg-elevated"
          />
        ) : !hasViewsActivity ? (
          <div
            data-testid="views-chart-empty"
            className="flex h-[260px] flex-col items-center justify-center gap-2.5 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep p-6 text-center"
          >
            <BarChart3 className="h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              SEM VISUALIZAÇÕES NO PERÍODO
            </p>
            <p className="max-w-sm font-mono text-mono-meta text-text-secondary">
              Compartilhe o link dos seus clipes na call para acompanhar a curva diária aqui.
            </p>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewsChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="clipaiViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2EB886" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#2EB886" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334B60" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date_label"
                  stroke="#91A1B2"
                  tick={{ fill: '#91A1B2', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)' }}
                  tickLine={false}
                  axisLine={{ stroke: '#4F6478' }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#91A1B2"
                  tick={{ fill: '#91A1B2', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ViewsTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessões"
                  stroke="#2EB886"
                  strokeWidth={2}
                  fill="url(#clipaiViewsGradient)"
                  activeDot={{ r: 5, fill: '#2EB886', stroke: '#061C2C', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      {/* Card 2: Curva de Retenção do Clipe (0% -> 100%) */}
      <article
        data-testid="studio-retention-chart-card"
        className="flex flex-col rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
      >
        <header className="mb-4 space-y-2 border-b border-border-muted pb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" aria-hidden="true" />
              <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                CURVA DE RETENÇÃO DO CLIPE
              </h2>
            </div>

            {retention && retention.biggest_drop_bucket_pct !== null && (
              <span
                data-testid="retention-biggest-drop-badge"
                className="inline-flex items-center gap-1.5 rounded-control border border-warning bg-bg-deep px-2.5 py-0.5 font-mono text-mono-badge font-semibold text-warning"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Maior queda nos {retention.biggest_drop_bucket_pct}%
              </span>
            )}
          </div>

          {retention ? (
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-mono-meta text-text-secondary">
              <p
                data-testid="retention-selected-clip-title"
                className="truncate font-semibold text-text-primary"
              >
                {retention.title}
              </p>
              <span className="inline-flex items-center gap-1.5 text-mono-badge text-text-secondary">
                <Clock className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                Média assistida: {formatDurationBadge(retention.avg_watch_seconds)} /{' '}
                {formatDurationBadge(retention.duration_seconds)}
              </span>
            </div>
          ) : (
            <p className="font-mono text-mono-meta text-text-secondary">
              Selecione um clipe na tabela abaixo para analisar a retenção trecho a trecho (0% →
              100%).
            </p>
          )}
        </header>

        {isLoadingRetention ? (
          <div
            aria-busy="true"
            className="h-[260px] w-full animate-pulse rounded-card bg-bg-elevated"
          />
        ) : !retention || retention.total_sessions === 0 ? (
          <div
            data-testid="retention-chart-empty"
            className="flex h-[260px] flex-col items-center justify-center gap-2.5 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep p-6 text-center"
          >
            <Activity className="h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              AGUARDANDO SESSÕES DE RETENÇÃO
            </p>
            <p className="max-w-sm font-mono text-mono-meta text-text-secondary">
              {retention
                ? `O clipe "${retention.title}" ainda não possui sessões de telemetria registradas neste período.`
                : 'Envie ou selecione um clipe para visualizar sua curva de retenção de 0% a 100%.'}
            </p>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={retentionChartData}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="clipaiRetentionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2EB886" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#2EB886" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334B60" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="bucket_label"
                  stroke="#91A1B2"
                  tick={{ fill: '#91A1B2', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)' }}
                  tickLine={false}
                  axisLine={{ stroke: '#4F6478' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(val: number) => `${val}%`}
                  stroke="#91A1B2"
                  tick={{ fill: '#91A1B2', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<RetentionTooltip />} />
                <Area
                  type="monotone"
                  dataKey="retention_pct"
                  name="Retenção"
                  stroke="#2EB886"
                  strokeWidth={2}
                  fill="url(#clipaiRetentionGradient)"
                  activeDot={{ r: 5, fill: '#2EB886', stroke: '#061C2C', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </section>
  );
}
