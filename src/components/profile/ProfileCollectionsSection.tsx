'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Film,
  FolderKanban,
  Globe,
  Lock,
  LogIn,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getCollectionVisibilityLabel,
  normalizeCollectionVisibility,
} from '@/lib/collection-privacy';
import type { Collection, CollectionVisibility } from '@/types/collection';

export type ProfileCollectionsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface ProfileCollectionsSectionProps {
  username: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  globalVisibility: CollectionVisibility;
  loadState: ProfileCollectionsLoadState;
  collections: Collection[];
  page: number;
  totalPages: number;
  errorMessage: string | null;
  onPageChange: (nextPage: number) => void;
  onRetry: () => void;
}

const EFFECTIVE_PRIVACY_STYLE: Record<
  CollectionVisibility,
  { Icon: typeof Globe; className: string }
> = {
  public: {
    Icon: Globe,
    className: 'border-success/60 bg-bg-deep text-success',
  },
  friends: {
    Icon: Users,
    className: 'border-warning/70 bg-bg-deep text-warning',
  },
  private: {
    Icon: Lock,
    className: 'border-border-muted bg-bg-deep text-text-secondary',
  },
};

function CollectionPrivacyBadge({
  collection,
}: Readonly<{
  collection: Collection;
}>) {
  const effective =
    collection.effective_privacy ?? normalizeCollectionVisibility(collection.privacy);
  const { Icon, className } = EFFECTIVE_PRIVACY_STYLE[effective];

  return (
    <span
      data-testid={`collection-privacy-badge-${collection.id}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-control border px-2 py-0.5 font-mono text-mono-badge ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{getCollectionVisibilityLabel(effective)}</span>
    </span>
  );
}

function ProfileCollectionCard({
  collection,
  showPrivacyBadge,
}: Readonly<{
  collection: Collection;
  showPrivacyBadge: boolean;
}>) {
  const coverUrl = collection.cover_thumbnail_url ?? collection.preview_thumbnails?.[0] ?? null;
  const accent = collection.accent_color || '#2EB886';
  const clipsLabel = `${collection.clips_count} ${collection.clips_count === 1 ? 'clipe' : 'clipes'}`;

  return (
    <Link
      href={`/collections/${collection.id}`}
      data-testid={`profile-collection-card-${collection.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border-muted bg-bg-surface transition-colors hover:border-success"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-bg-deep">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa da coleção ${collection.title}`}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-bg-deep p-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-card border bg-bg-surface"
              style={{ borderColor: accent }}
            >
              <FolderKanban className="h-6 w-6" style={{ color: accent }} aria-hidden="true" />
            </div>
            <span className="font-mono text-mono-badge uppercase text-text-muted">Coleção</span>
          </div>
        )}

        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />

        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-control bg-bg-deep/90 px-2 py-0.5 font-mono text-mono-badge text-text-primary">
          <Film className="h-3 w-3 text-success" aria-hidden="true" />
          {clipsLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 line-clamp-1 font-display text-display-md uppercase tracking-[0.06em] text-text-primary group-hover:text-success">
              {collection.title}
            </h3>
            {showPrivacyBadge && <CollectionPrivacyBadge collection={collection} />}
          </div>

          <p className="line-clamp-2 font-mono text-mono-meta text-text-secondary">
            {collection.description || 'Coleção de clipes selecionados.'}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border-muted pt-2.5 font-mono text-mono-badge text-text-muted">
          <span>{clipsLabel}</span>
          <span className="text-text-secondary transition-colors group-hover:text-success">
            Abrir coleção
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProfileCollectionsSection({
  username,
  isOwnProfile,
  isAuthenticated,
  globalVisibility,
  loadState,
  collections,
  page,
  totalPages,
  errorMessage,
  onPageChange,
  onRetry,
}: Readonly<ProfileCollectionsSectionProps>) {
  const isAnonymousFriendsGate =
    !isOwnProfile && !isAuthenticated && globalVisibility === 'friends';

  return (
    <section
      id="profile-tabpanel-collections"
      role="tabpanel"
      aria-label={`Coleções de @${username}`}
      className="space-y-4"
    >
      <div className="flex items-center justify-between border-b border-border-muted pb-3">
        <h2 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
          COLEÇÕES DE @{username}
        </h2>

        {!isAnonymousFriendsGate && loadState === 'ready' && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-mono-badge text-text-muted">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior de coleções"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-surface text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Próxima página de coleções"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-surface text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isOwnProfile && globalVisibility === 'private' && (
        <div
          role="status"
          data-testid="owner-private-collections-banner"
          className="flex flex-col justify-between gap-3 rounded-card border border-warning bg-bg-surface px-4 py-3 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-2.5 font-mono text-mono-meta text-text-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Esta aba está oculta para visitantes porque a privacidade global das suas coleções
              está definida como <strong className="text-text-primary">Somente Eu</strong>.
            </span>
          </div>
          <Link
            href="/settings?tab=privacy"
            className="shrink-0 font-mono text-mono-badge font-semibold text-warning underline underline-offset-2 hover:text-text-primary"
          >
            Ajustar em Privacidade
          </Link>
        </div>
      )}

      {isAnonymousFriendsGate && (
        <div
          data-testid="profile-collections-friends-gate"
          className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-card border border-warning bg-bg-deep">
            <Users className="h-6 w-6 text-warning" aria-hidden="true" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              COLEÇÕES EXCLUSIVAS PARA AMIGOS
            </h3>
            <p className="font-mono text-mono-meta text-text-secondary">
              As coleções de @{username} estão disponíveis apenas para usuários logados no CLIPAÍ.
            </p>
          </div>
          <Link href="/login">
            <Button type="button" variant="primary" leftIcon={<LogIn className="h-4 w-4" />}>
              ENTRAR PARA VER
            </Button>
          </Link>
        </div>
      )}

      {!isAnonymousFriendsGate && loadState === 'loading' && (
        <div
          aria-busy="true"
          aria-label="Carregando coleções"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-64 animate-pulse rounded-card border border-border-muted bg-bg-surface"
            />
          ))}
        </div>
      )}

      {!isAnonymousFriendsGate && loadState === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-danger bg-danger-surface p-8 text-center"
        >
          <p className="font-mono text-mono-body text-danger-text">
            {errorMessage || 'Não foi possível carregar as coleções deste perfil.'}
          </p>
          <Button type="button" variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isAnonymousFriendsGate && loadState === 'ready' && collections.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
          <FolderKanban className="h-10 w-10 text-text-muted" aria-hidden="true" />
          <div className="space-y-1">
            <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              NENHUMA COLEÇÃO EXIBIDA NO PERFIL
            </h3>
            <p className="font-mono text-mono-meta text-text-secondary">
              {isOwnProfile
                ? 'Ative a opção "Exibir no meu perfil público" ao criar ou editar uma coleção.'
                : 'Este jogador ainda não exibiu coleções visíveis neste perfil.'}
            </p>
          </div>
        </div>
      )}

      {!isAnonymousFriendsGate && loadState === 'ready' && collections.length > 0 && (
        <div
          data-testid="public-profile-collections-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {collections.map((collection) => (
            <ProfileCollectionCard
              key={collection.id}
              collection={collection}
              showPrivacyBadge={isOwnProfile}
            />
          ))}
        </div>
      )}
    </section>
  );
}
