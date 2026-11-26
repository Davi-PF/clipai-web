'use client';

import { ChevronLeft, ChevronRight, Film, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatDurationBadge } from '@/lib/validators';
import { isClipFavorited, isClipLiked, type ClipPeriod, type ClipSummary } from '@/types/clip';
import { getUserDisplayName } from '@/types/user';

const PERIOD_OPTIONS: readonly { value: ClipPeriod; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'all', label: 'Todo período' },
] as const;

export interface ClipQueueListProps {
  clips: ClipSummary[];
  activeClipId: string | null;
  sectionTitle?: string;
  emptyMessage?: string;
  showPeriodFilter?: boolean;
  period?: ClipPeriod;
  onPeriodChange?: (period: ClipPeriod) => void;
  isLoading: boolean;
  searchValue: string;
  page: number;
  totalPages: number;
  onSearchChange: (value: string) => void;
  onOpenUpload: () => void;
  onSelectClip: (clip: ClipSummary) => void;
  onPageChange: (nextPage: number) => void;
}

function getAccentBarColor(clip: ClipSummary, isActive: boolean, isTopHighlight: boolean): string {
  if (isActive) return 'bg-success';
  if (isTopHighlight || isClipFavorited(clip)) return 'bg-warning';
  if (isClipLiked(clip) || clip.likes_count >= 10) return 'bg-danger';
  return 'bg-border-muted';
}

interface ClipQueueListBodyProps {
  clips: ClipSummary[];
  activeClipId: string | null;
  emptyMessage: string;
  isLoading: boolean;
  onSelectClip: (clip: ClipSummary) => void;
}

function ClipQueueListBody({
  clips,
  activeClipId,
  emptyMessage,
  isLoading,
  onSelectClip,
}: Readonly<ClipQueueListBodyProps>) {
  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-[10px] xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-0.5"
        aria-busy="true"
        aria-label="Carregando fila"
      >
        {[1, 2, 3, 4].map((skeletonItem) => (
          <div
            key={skeletonItem}
            className="h-[76px] w-full shrink-0 animate-pulse rounded-card border border-border-muted bg-bg-elevated"
          />
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep p-6 text-center xl:min-h-0 xl:flex-1">
        <Film className="h-7 w-7 text-text-muted" aria-hidden="true" />
        <p className="font-mono text-mono-meta text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[10px] xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-0.5">
      {clips.map((clip) => {
        const isActive = clip.id === activeClipId;
        const isTopHighlight = Boolean(clip.is_top_highlight);
        const accentClass = getAccentBarColor(clip, isActive, isTopHighlight);
        const authorDisplayName = getUserDisplayName(clip.author);

        return (
          <button
            key={clip.id}
            type="button"
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelectClip(clip)}
            className={`group flex h-[76px] w-full shrink-0 overflow-hidden rounded-card border text-left transition-colors ${
              isActive
                ? 'border-success bg-bg-deep'
                : 'border-border-muted bg-bg-elevated/60 hover:border-text-secondary hover:bg-bg-elevated'
            }`}
          >
            <span className={`h-full w-1 shrink-0 ${accentClass}`} aria-hidden="true" />

            <div className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2">
              <div className="relative h-[56px] w-[100px] shrink-0 overflow-hidden rounded-[6px] bg-bg-deep">
                <img
                  src={clip.thumbnail_url}
                  alt={`Miniatura de ${clip.title}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 right-1 rounded-[4px] bg-bg-deep/90 px-1 py-0.5 font-mono text-[10px] leading-none text-text-primary">
                  {formatDurationBadge(clip.duration_seconds)}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p
                    className={`min-w-0 truncate font-mono text-mono-body font-semibold ${
                      isActive ? 'text-success' : 'text-text-primary'
                    }`}
                  >
                    {clip.title}
                  </p>
                  {isTopHighlight && (
                    <span
                      data-testid="queue-highlight-badge"
                      className="inline-flex h-4 shrink-0 items-center rounded-[4px] bg-warning px-1.5 font-mono text-[10px] font-bold uppercase leading-none text-bg-deep"
                    >
                      ★ DESTAQUE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-mono-badge text-text-muted">
                  <UserAvatar
                    username={clip.author.username}
                    displayName={clip.author.display_name}
                    avatarUrl={clip.author.avatar_url}
                    size="xs"
                  />
                  <p className="truncate">
                    {clip.game.name} • {authorDisplayName} (@{clip.author.username}) •{' '}
                    {clip.views_count} views
                  </p>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ClipQueueList({
  clips,
  activeClipId,
  sectionTitle = 'NA FILA / RECENTES',
  emptyMessage = 'Nenhum clipe na fila para este filtro.',
  showPeriodFilter = false,
  period = 'all',
  onPeriodChange,
  isLoading,
  searchValue,
  page,
  totalPages,
  onSearchChange,
  onOpenUpload,
  onSelectClip,
  onPageChange,
}: Readonly<ClipQueueListProps>) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <section
      aria-label="Busca e fila de clipes"
      className="flex w-full min-w-0 flex-col gap-3.5 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4 xl:min-h-0 xl:flex-1"
    >
      {/* Topo: Busca + CTA + ENVIAR */}
      <div className="flex w-full min-w-0 shrink-0 items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-3 focus-within:border-success">
          <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar clipes..."
            aria-label="Buscar clipes na fila"
            className="h-full min-w-0 w-full bg-transparent font-mono text-mono-meta text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          className="shrink-0"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onOpenUpload}
        >
          ENVIAR
        </Button>
      </div>

      {/* Cabeçalho da fila com paginação */}
      <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-2 border-b border-border-muted pb-2.5">
        <h2 className="min-w-0 truncate font-display text-display-md uppercase text-text-primary">
          {sectionTitle}
        </h2>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="whitespace-nowrap font-mono text-mono-badge text-text-muted">
            {page}/{safeTotalPages}
          </span>
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior da fila"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={page >= safeTotalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página da fila"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showPeriodFilter && onPeriodChange && (
        <div
          role="group"
          aria-label="Filtro de período"
          data-testid="queue-period-filter"
          className="flex shrink-0 flex-wrap items-center gap-1.5"
        >
          {PERIOD_OPTIONS.map((option) => {
            const isSelected = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onPeriodChange(option.value)}
                className={`rounded-control border px-2.5 py-1 font-mono text-mono-badge transition-colors ${
                  isSelected
                    ? 'border-success bg-bg-deep text-success'
                    : 'border-border-muted bg-bg-elevated text-text-secondary hover:border-text-secondary hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista limpa vertical (gap: 10px, zero sobreposição) com scroll interno sutil em xl+ */}
      <ClipQueueListBody
        clips={clips}
        activeClipId={activeClipId}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        onSelectClip={onSelectClip}
      />
    </section>
  );
}
