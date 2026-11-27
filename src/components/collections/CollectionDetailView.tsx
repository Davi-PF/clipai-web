'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Film,
  FolderKanban,
  Globe,
  Lock,
  LogIn,
  Users,
} from 'lucide-react';
import { ProfileClipCard } from '@/components/profile/ProfileClipCard';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import {
  getCollectionVisibilityLabel,
  normalizeCollectionVisibility,
} from '@/lib/collection-privacy';
import { collectionsService } from '@/services/collections-service';
import type { CollectionDetail, CollectionVisibility } from '@/types/collection';

type CollectionLoadState =
  'loading' | 'ready' | 'unauthorized' | 'forbidden' | 'not_found' | 'error';

const COLLECTION_CLIPS_PAGE_SIZE = 12;

const VISIBILITY_ICON: Record<CollectionVisibility, typeof Globe> = {
  public: Globe,
  friends: Users,
  private: Lock,
};

function resolveErrorLoadState(err: unknown): { state: CollectionLoadState; message: string } {
  if (err instanceof ApiClientError) {
    if (err.status === 401) {
      return {
        state: 'unauthorized',
        message: 'Faça login no CLIPAÍ para visualizar os clipes desta coleção.',
      };
    }
    if (err.status === 403) {
      return {
        state: 'forbidden',
        message: err.message || 'Esta coleção é privada e só pode ser visualizada pelo criador.',
      };
    }
    if (err.status === 404 || err.code === 'RESOURCE_NOT_FOUND') {
      return {
        state: 'not_found',
        message: 'A coleção solicitada não foi encontrada.',
      };
    }
    return { state: 'error', message: err.message };
  }
  return { state: 'error', message: 'Não foi possível carregar a coleção solicitada.' };
}

export function CollectionDetailView({ collectionId }: Readonly<{ collectionId: string }>) {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [loadState, setLoadState] = useState<CollectionLoadState>('loading');
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage(null);

    try {
      const res = await collectionsService.getCollection(collectionId, {
        page,
        page_size: COLLECTION_CLIPS_PAGE_SIZE,
      });
      setCollection(res);
      setTotalPages(Math.max(1, res.total_pages ?? 1));
      setLoadState('ready');
    } catch (err: unknown) {
      setCollection(null);
      const resolved = resolveErrorLoadState(err);
      setErrorMessage(resolved.message);
      setLoadState(resolved.state);
    }
  }, [collectionId, page]);

  useEffect(() => {
    if (!isAuthLoading) {
      void fetchCollection();
    }
  }, [fetchCollection, isAuthLoading]);

  const backHref = collection
    ? `/u/${collection.owner.username}`
    : currentUser
      ? '/dashboard'
      : '/';
  const backLabel = collection ? `Voltar para @${collection.owner.username}` : 'Voltar';
  const effectiveVisibility = collection
    ? (collection.effective_privacy ?? normalizeCollectionVisibility(collection.privacy))
    : 'public';
  const VisibilityIcon = VISIBILITY_ICON[effectiveVisibility];
  const accent = collection?.accent_color || '#2EB886';

  return (
    <main className="min-h-screen bg-bg-deep px-4 py-8 text-text-primary md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-surface px-3.5 py-2 font-mono text-mono-meta text-text-primary transition-colors hover:border-success"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>

          <Link href="/" className="inline-flex items-center">
            <BrandLogo variant="horizontal" size="md" showBeta />
          </Link>
        </header>

        {loadState === 'loading' && (
          <section aria-busy="true" aria-label="Carregando coleção" className="space-y-6">
            <div className="h-36 w-full animate-pulse rounded-bento border border-border-muted bg-bg-surface" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-64 animate-pulse rounded-card border border-border-muted bg-bg-surface"
                />
              ))}
            </div>
          </section>
        )}

        {loadState === 'unauthorized' && (
          <section
            data-testid="collection-unauthorized-state"
            className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-card border border-warning bg-bg-deep">
              <Users className="h-6 w-6 text-warning" aria-hidden="true" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                COLEÇÃO RESTRITA A AMIGOS
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">{errorMessage}</p>
            </div>
            <Link href="/login">
              <Button type="button" variant="primary" leftIcon={<LogIn className="h-4 w-4" />}>
                ENTRAR PARA VER
              </Button>
            </Link>
          </section>
        )}

        {loadState === 'forbidden' && (
          <section
            data-testid="collection-forbidden-state"
            className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-card border border-danger bg-danger-surface">
              <Lock className="h-6 w-6 text-danger-text" aria-hidden="true" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                COLEÇÃO PRIVADA
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">{errorMessage}</p>
            </div>
            <Link href={currentUser ? '/dashboard' : '/'}>
              <Button type="button" variant="secondary">
                Voltar para o início
              </Button>
            </Link>
          </section>
        )}

        {loadState === 'not_found' && (
          <section className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
            <FolderKanban className="h-12 w-12 text-text-muted" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                COLEÇÃO NÃO ENCONTRADA
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">{errorMessage}</p>
            </div>
            <Link href={currentUser ? '/dashboard' : '/'}>
              <Button type="button" variant="primary">
                VOLTAR PARA O INÍCIO
              </Button>
            </Link>
          </section>
        )}

        {loadState === 'error' && (
          <section
            role="alert"
            className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-danger bg-danger-surface p-8 text-center"
          >
            <p className="font-mono text-mono-body text-danger-text">{errorMessage}</p>
            <Button type="button" variant="secondary" onClick={() => void fetchCollection()}>
              Tentar novamente
            </Button>
          </section>
        )}

        {loadState === 'ready' && collection && (
          <>
            <section
              data-testid="collection-detail-header"
              className="relative overflow-hidden rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
            >
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge text-text-secondary">
                      <VisibilityIcon className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                      {getCollectionVisibilityLabel(effectiveVisibility)}
                    </span>
                    <span className="rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge text-text-primary">
                      {collection.clips_count} {collection.clips_count === 1 ? 'clipe' : 'clipes'}
                    </span>
                  </div>

                  <h1 className="break-words font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                    {collection.title}
                  </h1>

                  {collection.description && (
                    <p className="max-w-3xl font-mono text-mono-body text-text-secondary">
                      {collection.description}
                    </p>
                  )}

                  <p className="font-mono text-mono-meta text-text-muted">
                    Por{' '}
                    <Link
                      href={`/u/${collection.owner.username}`}
                      className="text-text-primary underline-offset-2 hover:text-success hover:underline"
                    >
                      @{collection.owner.username}
                    </Link>
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-muted pb-3">
                <h2 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                  CLIPES DA COLEÇÃO
                </h2>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-mono-badge text-text-muted">
                      Página {page} de {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Página anterior da coleção"
                      className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-surface text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Próxima página da coleção"
                      className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-surface text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {collection.clips.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
                  <Film className="h-10 w-10 text-text-muted" aria-hidden="true" />
                  <div className="space-y-1">
                    <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                      NENHUM CLIPE NESTA COLEÇÃO
                    </h3>
                    <p className="font-mono text-mono-meta text-text-secondary">
                      Esta coleção ainda não possui clipes disponíveis para exibição.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="collection-clips-grid"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {collection.clips.map((item) => (
                    <ProfileClipCard
                      key={item.clip.id}
                      id={item.clip.id}
                      slug={item.clip.slug}
                      title={item.clip.title}
                      thumbnailUrl={item.clip.thumbnail_url}
                      durationSeconds={item.clip.duration_seconds}
                      viewsCount={item.clip.views_count}
                      likesCount={item.clip.likes_count}
                      gameName={item.clip.game?.name}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
