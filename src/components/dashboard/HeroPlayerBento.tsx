'use client';

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Film,
  Gamepad2,
  Heart,
  Plus,
  Star,
} from 'lucide-react';
import { ClipPlayer } from '@/components/player/ClipPlayer';
import { Button } from '@/components/ui/Button';
import { useLShapePath } from '@/hooks/useLShapePath';
import { formatDurationBadge } from '@/lib/validators';
import { getClipShareSlug, isClipFavorited, isClipLiked, type ClipSummary } from '@/types/clip';

export interface HeroPlayerBentoProps {
  clip: ClipSummary | null;
  isLoading: boolean;
  isFeaturedHighlight?: boolean;
  isSidebarCollapsed: boolean;
  isLikePending: boolean;
  isFavoritePending: boolean;
  onToggleSidebar: () => void;
  onPlayStart: (clip: ClipSummary) => void;
  onToggleLike: (clip: ClipSummary) => void;
  onToggleFavorite: (clip: ClipSummary) => void;
  onOpenSaveCollection: (clip: ClipSummary) => void;
  onCopyLink: (clip: ClipSummary) => void;
  onOpenUpload: () => void;
  quickFiltersSlot: ReactNode;
  cutoutRef: React.RefObject<HTMLDivElement | null>;
}

export function HeroPlayerBento({
  clip,
  isLoading,
  isFeaturedHighlight = false,
  isSidebarCollapsed,
  isLikePending,
  isFavoritePending,
  onToggleSidebar,
  onPlayStart,
  onToggleLike,
  onToggleFavorite,
  onOpenSaveCollection,
  onCopyLink,
  onOpenUpload,
  quickFiltersSlot,
  cutoutRef,
}: Readonly<HeroPlayerBentoProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height, cutoutHeight, notchY, clipPath, strokePath, isReady } = useLShapePath(
    containerRef,
    cutoutRef,
    true,
  );

  const liked = clip ? isClipLiked(clip) : false;
  const favorited = clip ? isClipFavorited(clip) : false;
  const showFeaturedBadge = Boolean(clip && (isFeaturedHighlight || clip.likes_count >= 10));

  return (
    <div className="relative flex flex-col gap-3">
      {/* Container principal com geometria em "L" no desktop (lg+) */}
      <div
        ref={containerRef}
        className="relative w-full"
        data-lshape-ready={isReady ? 'true' : 'false'}
      >
        {/* Botão flutuante no recorte semicircular esquerdo para recolher/expandir a Sidebar Líquida */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          title={isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          style={isReady && notchY > 0 ? { top: `${notchY}px` } : { top: '44%' }}
          className="absolute -left-4 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-border-muted bg-bg-surface text-text-primary shadow-md transition-colors hover:border-success hover:bg-bg-elevated hover:text-success lg:flex"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {/* Superfície recortada em "L" no desktop (ou retangular em < lg) */}
        <div
          style={isReady ? { clipPath: `path('${clipPath}')` } : undefined}
          className={`relative overflow-hidden bg-bg-surface ${
            isReady ? '' : 'rounded-bento border-[1.5px] border-border-muted'
          }`}
        >
          {isLoading && (
            <div
              aria-busy="true"
              aria-label="Carregando player em destaque"
              className="flex min-h-[420px] flex-col justify-between p-5 lg:min-h-[540px]"
            >
              <div className="aspect-video w-full animate-pulse rounded-card bg-bg-elevated" />
              <div className="mt-4 max-w-md space-y-2.5 lg:pr-8">
                <div className="h-7 w-3/4 animate-pulse rounded-control bg-bg-elevated" />
                <div className="h-4 w-1/2 animate-pulse rounded-control bg-bg-elevated" />
                <div className="flex gap-2 pt-2">
                  <div className="h-9 w-24 animate-pulse rounded-full bg-bg-elevated" />
                  <div className="h-9 w-24 animate-pulse rounded-full bg-bg-elevated" />
                </div>
              </div>
            </div>
          )}

          {!isLoading && !clip && (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center lg:min-h-[540px] lg:pb-36">
              <div className="flex h-14 w-14 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
                <Film className="h-7 w-7 text-text-muted" aria-hidden="true" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h2 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                  NENHUM CLIPE ENCONTRADO
                </h2>
                <p className="font-mono text-mono-body text-text-secondary">
                  Não há clipes para o filtro atual. Envie sua primeira jogada ou ajuste os filtros
                  ao lado.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={onOpenUpload}
              >
                ENVIAR PRIMEIRO CLIPE
              </Button>
            </div>
          )}

          {!isLoading && clip && (
            <div className="flex flex-col">
              {/* Área do Player 16:9 com badges superiores */}
              <div className="relative bg-bg-deep">
                <div className="pointer-events-none absolute left-4 top-3 z-20 flex flex-wrap items-center gap-2">
                  {showFeaturedBadge && (
                    <span className="inline-flex items-center gap-1 rounded-control bg-warning px-2.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
                      ★ DESTAQUE
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep/90 px-2.5 py-0.5 font-mono text-mono-badge uppercase text-success">
                    <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {clip.game.name}
                  </span>
                  <span className="rounded-control border border-border-muted bg-bg-deep/90 px-2.5 py-0.5 font-mono text-mono-badge text-text-primary">
                    @{clip.author.username}
                  </span>
                </div>

                <ClipPlayer
                  src={clip.video_url}
                  poster={clip.thumbnail_url}
                  title={clip.title}
                  initialDuration={clip.duration_seconds}
                  borderless
                  onPlayStart={() => onPlayStart(clip)}
                />
              </div>

              {/* Perna inferior esquerda do "L": altura mínima = cutoutHeight + 20px (18px do raio do canto) para o vídeo nunca ser cortado */}
              <div
                style={
                  isReady && cutoutHeight > 0 ? { minHeight: `${cutoutHeight + 20}px` } : undefined
                }
                className="flex flex-col justify-center space-y-3 border-t border-border-muted/30 p-5 lg:max-w-[calc(100%-340px)]"
              >
                <div className="space-y-1">
                  <h1 className="line-clamp-2 font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                    {clip.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-mono-badge text-text-secondary">
                    <span>{formatDurationBadge(clip.duration_seconds)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                      {clip.views_count} views
                    </span>
                    {clip.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-control border border-border-muted bg-bg-deep px-2 py-0.5 text-text-secondary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Barra de ações em pill */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isLikePending}
                    aria-pressed={liked}
                    aria-label={liked ? 'Remover curtida' : 'Curtir clipe'}
                    onClick={() => onToggleLike(clip)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-mono text-mono-meta transition-colors ${
                      liked
                        ? 'border-danger bg-danger-surface text-text-primary'
                        : 'border-border-muted bg-bg-elevated text-text-primary hover:border-danger'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${liked ? 'fill-danger text-danger' : 'text-text-secondary'}`}
                      aria-hidden="true"
                    />
                    <span>{clip.likes_count}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFavoritePending}
                    aria-pressed={favorited}
                    aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar clipe'}
                    onClick={() => onToggleFavorite(clip)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-mono text-mono-meta transition-colors ${
                      favorited
                        ? 'border-warning bg-bg-deep text-warning'
                        : 'border-border-muted bg-bg-elevated text-text-primary hover:border-warning'
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${favorited ? 'fill-warning text-warning' : 'text-text-secondary'}`}
                      aria-hidden="true"
                    />
                    <span>{favorited ? 'Favorito' : 'Favoritar'}</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Salvar em coleção"
                    onClick={() => onOpenSaveCollection(clip)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-muted bg-bg-elevated px-3.5 font-mono text-mono-meta text-text-primary transition-colors hover:border-success hover:text-success"
                  >
                    <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                    <span>Salvar</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Copiar link do clipe"
                    onClick={() => onCopyLink(clip)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-muted bg-bg-elevated px-3.5 font-mono text-mono-meta text-text-primary transition-colors hover:border-success hover:bg-success-surface"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>Copiar</span>
                  </button>

                  <Link
                    href={`/c/${getClipShareSlug(clip)}`}
                    aria-label="Abrir página dedicada do clipe"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-muted bg-bg-deep px-3.5 font-mono text-mono-meta text-text-secondary transition-colors hover:border-success hover:text-text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Abrir</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contorno SVG contínuo de 1.5px (#4F6478) sincronizado via ResizeObserver */}
        {isReady && width > 0 && height > 0 && (
          <svg
            aria-hidden="true"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="pointer-events-none absolute inset-0 z-20 hidden lg:block"
          >
            <path
              d={strokePath}
              fill="none"
              stroke="var(--border-muted)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Encaixe do Card Filtros Rápidos 3x3 no recorte inferior direito do "L" (desktop lg+) */}
        <div className="mt-3 lg:absolute lg:bottom-0 lg:right-0 lg:z-20 lg:mt-0 lg:w-[324px]">
          {quickFiltersSlot}
        </div>
      </div>
    </div>
  );
}
