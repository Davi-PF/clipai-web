'use client';

import type { RefObject } from 'react';
import { Filter, X } from 'lucide-react';
import type { Game, Tag } from '@/types/clip';

export interface QuickFilterSelection {
  gameSlug?: string;
  tagSlug?: string;
}

interface QuickFilterCell {
  key: string;
  label: string;
  kind: 'all' | 'game' | 'tag';
  slug?: string;
}

export interface QuickFiltersCardProps {
  games: Game[];
  tags: Tag[];
  activeFilter: QuickFilterSelection;
  onSelectFilter: (next: QuickFilterSelection) => void;
  onClearFilters: () => void;
  cardRef?: RefObject<HTMLDivElement | null>;
}

function buildNineFilterCells(games: Game[], tags: Tag[]): QuickFilterCell[] {
  const cells: QuickFilterCell[] = [{ key: 'all', label: 'Todos', kind: 'all' }];

  for (const game of games.slice(0, 4)) {
    cells.push({
      key: `game:${game.slug}`,
      label: game.name,
      kind: 'game',
      slug: game.slug,
    });
  }

  for (const tag of tags) {
    if (cells.length >= 9) break;
    cells.push({
      key: `tag:${tag.slug}`,
      label: `#${tag.name}`,
      kind: 'tag',
      slug: tag.slug,
    });
  }

  return cells.slice(0, 9);
}

export function QuickFiltersCard({
  games,
  tags,
  activeFilter,
  onSelectFilter,
  onClearFilters,
  cardRef,
}: Readonly<QuickFiltersCardProps>) {
  const cells = buildNineFilterCells(games, tags);
  const hasActiveFilter = Boolean(activeFilter.gameSlug || activeFilter.tagSlug);

  return (
    <section
      ref={cardRef}
      aria-label="Filtros rápidos"
      className="w-full rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-3"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            FILTROS RÁPIDOS
          </h2>
        </div>

        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilter}
          className="inline-flex items-center gap-1 rounded-control px-2 py-0.5 font-mono text-mono-badge uppercase text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          LIMPAR
        </button>
      </header>

      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((cell) => {
          const isSelected =
            (cell.kind === 'all' && !hasActiveFilter) ||
            (cell.kind === 'game' && activeFilter.gameSlug === cell.slug) ||
            (cell.kind === 'tag' && activeFilter.tagSlug === cell.slug);

          const handleClick = () => {
            if (cell.kind === 'all') {
              onClearFilters();
            } else if (cell.kind === 'game') {
              onSelectFilter({ gameSlug: cell.slug });
            } else {
              onSelectFilter({ tagSlug: cell.slug });
            }
          };

          return (
            <button
              key={cell.key}
              type="button"
              aria-pressed={isSelected}
              onClick={handleClick}
              className={`relative flex h-8 items-center justify-center gap-1 rounded-control border px-2 font-mono text-mono-badge transition-colors ${
                isSelected
                  ? 'border-success bg-bg-deep font-semibold text-text-primary'
                  : 'border-border-muted bg-bg-elevated text-text-secondary hover:border-text-secondary hover:text-text-primary'
              }`}
            >
              {isSelected && (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              )}
              <span className="truncate">{cell.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
