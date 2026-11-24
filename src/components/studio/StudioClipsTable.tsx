'use client';

import Link from 'next/link';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Film,
  Gamepad2,
  Globe,
  Heart,
  Link2,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDurationBadge } from '@/lib/validators';
import {
  formatPercentage,
  getRetentionTone,
  type AnalyticsClipSort,
  type CreatorClipAnalyticsItem,
  type RetentionTone,
} from '@/types/analytics';
import type { PrivacyLevel } from '@/types/api';

const PRIVACY_META: Record<PrivacyLevel, { label: string; Icon: typeof Globe }> = {
  public: { label: 'Público', Icon: Globe },
  friends: { label: 'Só Amigos', Icon: Users },
  unlisted: { label: 'Não-listado', Icon: Link2 },
};

const RETENTION_BAR_CLASSES: Record<RetentionTone, string> = {
  high: 'bg-success',
  medium: 'bg-warning',
  low: 'bg-danger-text',
};

const RETENTION_TEXT_CLASSES: Record<RetentionTone, string> = {
  high: 'text-success',
  medium: 'text-warning',
  low: 'text-danger-text',
};

interface StudioClipsEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onOpenUpload: () => void;
}

function StudioClipsEmptyState({
  hasFilters,
  onClearFilters,
  onOpenUpload,
}: Readonly<StudioClipsEmptyStateProps>) {
  return (
    <div
      data-testid="studio-clips-empty"
      className="mt-5 flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep p-10 text-center"
    >
      <Film className="h-10 w-10 text-text-muted" aria-hidden="true" />
      <div className="space-y-1">
        <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
          {hasFilters ? 'NENHUM CLIPE ENCONTRADO NESTE FILTRO' : 'VOCÊ AINDA NÃO ENVIOU CLIPES'}
        </h3>
        <p className="font-mono text-mono-meta text-text-secondary">
          {hasFilters
            ? 'Tente ajustar a busca ou limpar o filtro de privacidade.'
            : 'Envie sua primeira jogada para começar a acompanhar visualizações e curva de retenção.'}
        </p>
      </div>
      {hasFilters ? (
        <Button type="button" variant="secondary" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      ) : (
        <Button
          type="button"
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onOpenUpload}
        >
          ENVIAR PRIMEIRO CLIPE
        </Button>
      )}
    </div>
  );
}

interface StudioClipsTableBodyProps {
  clips: CreatorClipAnalyticsItem[];
  selectedClipId: string | null;
  isLoading: boolean;
  hasFilters: boolean;
  onSelectClip: (clip: CreatorClipAnalyticsItem) => void;
  onCopyLink: (clip: CreatorClipAnalyticsItem) => void;
  onEditClip: (clip: CreatorClipAnalyticsItem) => void;
  onDeleteClip: (clip: CreatorClipAnalyticsItem) => void;
  onOpenUpload: () => void;
  onClearFilters: () => void;
}

function StudioClipsTableBody({
  clips,
  selectedClipId,
  isLoading,
  hasFilters,
  onSelectClip,
  onCopyLink,
  onEditClip,
  onDeleteClip,
  onOpenUpload,
  onClearFilters,
}: Readonly<StudioClipsTableBodyProps>) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Carregando lista de clipes" className="mt-4 space-y-3">
        {[1, 2, 3, 4].map((row) => (
          <div
            key={row}
            className="h-20 w-full animate-pulse rounded-card border border-border-muted bg-bg-elevated"
          />
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <StudioClipsEmptyState
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
        onOpenUpload={onOpenUpload}
      />
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border-muted font-mono text-mono-badge uppercase text-text-muted">
            <th className="pb-3 pr-4 font-medium">Clipe</th>
            <th className="pb-3 pr-4 font-medium">Privacidade</th>
            <th className="pb-3 pr-4 font-medium">Views / Likes</th>
            <th className="pb-3 pr-4 font-medium">Retenção</th>
            <th className="pb-3 pr-4 font-medium">Conclusão</th>
            <th className="pb-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-muted/60">
          {clips.map((clip) => {
            const isSelected = clip.id === selectedClipId;
            const privacyMeta = PRIVACY_META[clip.privacy];
            const PrivacyIcon = privacyMeta.Icon;
            const retentionTone = getRetentionTone(clip.avg_retention_pct);
            const retentionWidth = Math.min(100, Math.max(0, clip.avg_retention_pct));

            return (
              <tr
                key={clip.id}
                data-testid={`studio-clip-row-${clip.id}`}
                data-selected={isSelected ? 'true' : 'false'}
                className={`transition-colors ${
                  isSelected ? 'bg-bg-deep/85' : 'hover:bg-bg-elevated/40'
                }`}
              >
                {/* Thumbnail 16:9 + Título + Jogo */}
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-[52px] w-[92px] shrink-0 overflow-hidden rounded-[6px] border border-border-muted bg-bg-deep">
                      <img
                        src={clip.thumbnail_url}
                        alt={`Miniatura de ${clip.title}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 rounded-[4px] bg-bg-deep/90 px-1 py-0.5 font-mono text-[10px] leading-none text-text-primary">
                        {formatDurationBadge(clip.duration_seconds)}
                      </span>
                    </div>

                    <div className="min-w-0 max-w-[260px] space-y-1">
                      <p
                        className={`truncate font-mono text-mono-body font-semibold ${
                          isSelected ? 'text-success' : 'text-text-primary'
                        }`}
                      >
                        {clip.title}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-control border border-border-muted bg-bg-deep px-2 py-0.5 font-mono text-mono-badge uppercase text-success">
                        <Gamepad2 className="h-3 w-3" aria-hidden="true" />
                        {clip.game_name}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Privacidade */}
                <td className="py-3.5 pr-4">
                  <span className="inline-flex items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge text-text-primary">
                    <PrivacyIcon className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
                    {privacyMeta.label}
                  </span>
                </td>

                {/* Views e Curtidas */}
                <td className="py-3.5 pr-4">
                  <div className="space-y-1 font-mono text-mono-meta">
                    <p className="flex items-center gap-1.5 text-text-primary">
                      <Eye className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                      <span>{clip.views_count.toLocaleString('pt-BR')}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-danger-text">
                      <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>{clip.likes_count.toLocaleString('pt-BR')}</span>
                    </p>
                  </div>
                </td>

                {/* Barra visual de Retenção % */}
                <td className="py-3.5 pr-4">
                  <div className="w-32 space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-mono-badge">
                      <span className={`font-semibold ${RETENTION_TEXT_CLASSES[retentionTone]}`}>
                        {formatPercentage(clip.avg_retention_pct)}
                      </span>
                      <span className="text-text-muted">{clip.sessions_count} sess.</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-bg-deep">
                      <div
                        style={{ width: `${retentionWidth}%` }}
                        className={`h-full rounded-full transition-all ${RETENTION_BAR_CLASSES[retentionTone]}`}
                      />
                    </div>
                  </div>
                </td>

                {/* Taxa de conclusão */}
                <td className="py-3.5 pr-4 font-mono text-mono-body font-semibold text-text-primary">
                  {formatPercentage(clip.completion_rate_pct)}
                </td>

                {/* Ações rápidas */}
                <td className="py-3.5 text-right">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectClip(clip)}
                      aria-label={`Ver retenção de ${clip.title}`}
                      aria-pressed={isSelected}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 font-mono text-mono-badge transition-colors ${
                        isSelected
                          ? 'border-success bg-success-surface text-text-primary'
                          : 'border-border-muted bg-bg-elevated text-text-primary hover:border-success'
                      }`}
                    >
                      <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Ver Retenção</span>
                    </button>

                    <Link
                      href={`/c/${clip.slug || clip.id}`}
                      aria-label={`Abrir ${clip.title}`}
                      title="Abrir página do clipe"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => onCopyLink(clip)}
                      aria-label={`Copiar link de ${clip.title}`}
                      title="Copiar link"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-success"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditClip(clip)}
                      aria-label={`Editar ${clip.title}`}
                      title="Editar clipe"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-warning hover:text-warning"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteClip(clip)}
                      aria-label={`Excluir ${clip.title}`}
                      title="Excluir clipe"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-danger-text transition-colors hover:border-danger hover:bg-danger-surface"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export interface StudioClipsTableProps {
  clips: CreatorClipAnalyticsItem[];
  selectedClipId: string | null;
  isLoading: boolean;
  searchValue: string;
  privacyFilter: PrivacyLevel | 'all';
  sortBy: AnalyticsClipSort;
  page: number;
  totalPages: number;
  onSearchChange: (value: string) => void;
  onPrivacyChange: (privacy: PrivacyLevel | 'all') => void;
  onSortChange: (sort: AnalyticsClipSort) => void;
  onPageChange: (nextPage: number) => void;
  onSelectClip: (clip: CreatorClipAnalyticsItem) => void;
  onCopyLink: (clip: CreatorClipAnalyticsItem) => void;
  onEditClip: (clip: CreatorClipAnalyticsItem) => void;
  onDeleteClip: (clip: CreatorClipAnalyticsItem) => void;
  onOpenUpload: () => void;
  onClearFilters: () => void;
}

export function StudioClipsTable({
  clips,
  selectedClipId,
  isLoading,
  searchValue,
  privacyFilter,
  sortBy,
  page,
  totalPages,
  onSearchChange,
  onPrivacyChange,
  onSortChange,
  onPageChange,
  onSelectClip,
  onCopyLink,
  onEditClip,
  onDeleteClip,
  onOpenUpload,
  onClearFilters,
}: Readonly<StudioClipsTableProps>) {
  const hasFilters = Boolean(searchValue.trim() || privacyFilter !== 'all');
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <section
      aria-label="Meus clipes e desempenho"
      data-testid="studio-clips-section"
      className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5"
    >
      {/* Cabeçalho e barra de filtros */}
      <div className="flex flex-col justify-between gap-4 border-b border-border-muted pb-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
            MEUS CLIPES &amp; DESEMPENHO
          </h2>
          <p className="font-mono text-mono-meta text-text-secondary">
            Clique em <strong>Ver Retenção</strong> em qualquer clipe para inspecionar sua curva
            acima.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Busca por título */}
          <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-3 focus-within:border-success sm:flex-initial">
            <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por título..."
              aria-label="Buscar clipe no estúdio"
              className="h-full w-full bg-transparent font-mono text-mono-meta text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>

          {/* Filtro por privacidade */}
          <select
            aria-label="Filtrar por privacidade"
            value={privacyFilter}
            onChange={(event) => onPrivacyChange(event.target.value as PrivacyLevel | 'all')}
            className="h-10 rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-meta text-text-primary focus:border-success focus:outline-none"
          >
            <option value="all">Todas privacidades</option>
            <option value="public">Público</option>
            <option value="friends">Só Amigos</option>
            <option value="unlisted">Não-listado</option>
          </select>

          {/* Ordenação */}
          <select
            aria-label="Ordenar clipes"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as AnalyticsClipSort)}
            className="h-10 rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-meta text-text-primary focus:border-success focus:outline-none"
          >
            <option value="views">Mais vistos</option>
            <option value="retention">Maior retenção</option>
            <option value="likes">Mais curtidos</option>
            <option value="recent">Mais recentes</option>
          </select>
        </div>
      </div>

      {/* Corpo da tabela / estados */}
      <StudioClipsTableBody
        clips={clips}
        selectedClipId={selectedClipId}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onSelectClip={onSelectClip}
        onCopyLink={onCopyLink}
        onEditClip={onEditClip}
        onDeleteClip={onDeleteClip}
        onOpenUpload={onOpenUpload}
        onClearFilters={onClearFilters}
      />

      {/* Paginação */}
      {safeTotalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border-muted pt-3.5 font-mono text-mono-badge text-text-muted">
          <span>
            Página {page} de {safeTotalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior do estúdio"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={page >= safeTotalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              aria-label="Próxima página do estúdio"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
