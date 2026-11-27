'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Film,
  FolderKanban,
  Settings,
  UserX,
} from 'lucide-react';
import { FriendshipActionButton } from '@/components/profile/FriendshipActionButton';
import { ProfileClipCard } from '@/components/profile/ProfileClipCard';
import {
  ProfileCollectionsSection,
  type ProfileCollectionsLoadState,
} from '@/components/profile/ProfileCollectionsSection';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { normalizeCollectionVisibility } from '@/lib/collection-privacy';
import { userService } from '@/services/user-service';
import type { ClipSummary } from '@/types/clip';
import type { Collection } from '@/types/collection';
import type { FriendshipStatus } from '@/types/friendship';
import { getUserDisplayName, type PublicUserProfile } from '@/types/user';

type ProfileLoadState = 'loading' | 'ready' | 'not_found' | 'error';
type ProfileTabId = 'clips' | 'collections';

const CLIPS_PAGE_SIZE = 12;
const COLLECTIONS_PAGE_SIZE = 12;

export function PublicProfileView({ username }: Readonly<{ username: string }>) {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [loadState, setLoadState] = useState<ProfileLoadState>('loading');
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('clips');

  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoadState, setCollectionsLoadState] =
    useState<ProfileCollectionsLoadState>('idle');
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsTotalPages, setCollectionsTotalPages] = useState(1);
  const [collectionsTotal, setCollectionsTotal] = useState<number | null>(null);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);

  const fetchProfileAndClips = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage(null);

    try {
      const [profileRes, clipsRes] = await Promise.all([
        userService.getPublicProfile(username),
        userService.listUserClips(username, { page, page_size: CLIPS_PAGE_SIZE }),
      ]);

      setProfile(profileRes);
      setClips(clipsRes.items);
      setTotalPages(Math.max(1, clipsRes.total_pages));
      setLoadState('ready');
    } catch (err: unknown) {
      setProfile(null);
      setClips([]);
      if (
        err instanceof ApiClientError &&
        (err.status === 404 || err.code === 'RESOURCE_NOT_FOUND')
      ) {
        setLoadState('not_found');
        return;
      }
      setErrorMessage(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar o perfil solicitado.',
      );
      setLoadState('error');
    }
  }, [username, page]);

  useEffect(() => {
    if (!isAuthLoading) {
      void fetchProfileAndClips();
    }
  }, [fetchProfileAndClips, isAuthLoading]);

  const normalizedCurrentUsername = currentUser?.username.trim().toLowerCase();
  const normalizedProfileUsername = profile?.username.trim().toLowerCase();
  const isOwnProfile = Boolean(
    normalizedCurrentUsername && normalizedCurrentUsername === normalizedProfileUsername,
  );

  const globalVisibility = normalizeCollectionVisibility(profile?.collections_visibility);
  const canShowCollectionsTab = isOwnProfile || globalVisibility !== 'private';
  const isAnonymousFriendsGate = !isOwnProfile && !currentUser && globalVisibility === 'friends';
  const resolvedTab: ProfileTabId =
    activeTab === 'collections' && canShowCollectionsTab ? 'collections' : 'clips';

  const fetchProfileCollections = useCallback(async () => {
    setCollectionsLoadState('loading');
    setCollectionsError(null);

    try {
      const res = await userService.listUserCollections(username, {
        page: collectionsPage,
        page_size: COLLECTIONS_PAGE_SIZE,
      });
      setCollections(res.items);
      setCollectionsTotal(res.total);
      setCollectionsTotalPages(Math.max(1, res.total_pages));
      setCollectionsLoadState('ready');
    } catch (err: unknown) {
      setCollections([]);
      setCollectionsError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar as coleções deste perfil.',
      );
      setCollectionsLoadState('error');
    }
  }, [username, collectionsPage]);

  useEffect(() => {
    if (
      loadState === 'ready' &&
      resolvedTab === 'collections' &&
      canShowCollectionsTab &&
      !isAnonymousFriendsGate
    ) {
      void fetchProfileCollections();
    }
  }, [
    loadState,
    resolvedTab,
    canShowCollectionsTab,
    isAnonymousFriendsGate,
    fetchProfileCollections,
  ]);

  const handleFriendshipStatusChange = (
    nextStatus: FriendshipStatus,
    nextFriendshipId: string | null,
  ) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            friendship_status: nextStatus,
            friendship_id: nextFriendshipId,
          }
        : prev,
    );
  };

  const clipsCount = profile?.stats?.clips_count ?? profile?.clips_count ?? clips.length;
  const totalViews = profile?.stats?.total_views ?? profile?.total_views ?? 0;
  const totalLikes = profile?.stats?.total_likes ?? profile?.total_likes ?? 0;
  const collectionsCount =
    collectionsTotal ?? profile?.stats?.collections_count ?? profile?.collections_count ?? 0;

  return (
    <main className="min-h-screen bg-bg-deep px-4 py-8 text-text-primary md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={currentUser ? '/dashboard' : '/'}
            className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-surface px-3.5 py-2 font-mono text-mono-meta text-text-primary transition-colors hover:border-success"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>

          <Link href="/" className="inline-flex items-center">
            <BrandLogo variant="horizontal" size="md" showBeta />
          </Link>
        </header>

        {loadState === 'loading' && (
          <section aria-busy="true" aria-label="Carregando perfil" className="space-y-6">
            <div className="h-44 w-full animate-pulse rounded-bento border border-border-muted bg-bg-surface" />
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

        {loadState === 'not_found' && (
          <section className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
            <UserX className="h-12 w-12 text-text-muted" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                PERFIL NÃO ENCONTRADO
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">
                O jogador <strong>@{username}</strong> não foi encontrado no CLIPAÍ.
              </p>
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
            <Button type="button" variant="secondary" onClick={() => void fetchProfileAndClips()}>
              Tentar novamente
            </Button>
          </section>
        )}

        {loadState === 'ready' && profile && (
          <>
            {/* Card Principal do Perfil Público */}
            <section
              data-testid="public-profile-header"
              className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <UserAvatar
                    username={profile.username}
                    displayName={profile.display_name}
                    avatarUrl={profile.avatar_url}
                    size="xl"
                  />

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                        {getUserDisplayName(profile)}
                      </h1>
                      <span className="rounded-control border border-border-muted bg-bg-deep px-2.5 py-0.5 font-mono text-mono-meta text-text-secondary">
                        @{profile.username}
                      </span>
                      {profile.discord_linked && (
                        <DiscordBadge discordUsername={profile.discord_username} />
                      )}
                      {!isOwnProfile && (
                        <FriendshipActionButton
                          targetUserId={profile.id}
                          targetUsername={profile.username}
                          targetDisplayName={getUserDisplayName(profile)}
                          isAuthenticated={Boolean(currentUser)}
                          status={profile.friendship_status ?? 'none'}
                          friendshipId={profile.friendship_id ?? null}
                          onStatusChange={handleFriendshipStatusChange}
                        />
                      )}
                    </div>

                    <p className="max-w-2xl font-mono text-mono-body text-text-secondary">
                      {profile.bio || 'Jogador da comunidade CLIPAÍ.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-card border border-border-muted bg-bg-deep px-4 py-2.5 text-center">
                      <span className="block font-display text-display-md text-text-primary">
                        {clipsCount}
                      </span>
                      <span className="font-mono text-mono-badge uppercase text-text-muted">
                        Clipes
                      </span>
                    </div>
                    <div className="rounded-card border border-border-muted bg-bg-deep px-4 py-2.5 text-center">
                      <span className="block font-display text-display-md text-text-primary">
                        {totalViews}
                      </span>
                      <span className="font-mono text-mono-badge uppercase text-text-muted">
                        Views
                      </span>
                    </div>
                    <div className="rounded-card border border-border-muted bg-bg-deep px-4 py-2.5 text-center">
                      <span className="block font-display text-display-md text-danger">
                        {totalLikes}
                      </span>
                      <span className="font-mono text-mono-badge uppercase text-text-muted">
                        Likes
                      </span>
                    </div>
                  </div>

                  {isOwnProfile && (
                    <Link href="/settings">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Settings className="h-4 w-4" />}
                      >
                        Editar perfil
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Barra de Abas: Clipes & Coleções */}
            <div
              role="tablist"
              aria-label="Seções do perfil"
              className="flex flex-wrap gap-2 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-2"
            >
              <button
                type="button"
                role="tab"
                id="profile-tab-clips"
                aria-selected={resolvedTab === 'clips'}
                aria-controls="profile-tabpanel-clips"
                onClick={() => setActiveTab('clips')}
                className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-mono text-mono-body transition-colors sm:flex-none ${
                  resolvedTab === 'clips'
                    ? 'border-success bg-bg-deep font-semibold text-text-primary'
                    : 'border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                }`}
              >
                <Film
                  className={`h-4 w-4 shrink-0 ${
                    resolvedTab === 'clips' ? 'text-success' : 'text-text-muted'
                  }`}
                  aria-hidden="true"
                />
                <span>Clipes</span>
                <span className="rounded-control border border-border-muted bg-bg-surface px-1.5 py-0.5 font-mono text-mono-badge text-text-secondary">
                  {clipsCount}
                </span>
              </button>

              {canShowCollectionsTab && (
                <button
                  type="button"
                  role="tab"
                  id="profile-tab-collections"
                  aria-selected={resolvedTab === 'collections'}
                  aria-controls="profile-tabpanel-collections"
                  onClick={() => setActiveTab('collections')}
                  className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-mono text-mono-body transition-colors sm:flex-none ${
                    resolvedTab === 'collections'
                      ? 'border-success bg-bg-deep font-semibold text-text-primary'
                      : 'border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  <FolderKanban
                    className={`h-4 w-4 shrink-0 ${
                      resolvedTab === 'collections' ? 'text-success' : 'text-text-muted'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Coleções</span>
                  {!isAnonymousFriendsGate && (
                    <span className="rounded-control border border-border-muted bg-bg-surface px-1.5 py-0.5 font-mono text-mono-badge text-text-secondary">
                      {collectionsCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {resolvedTab === 'clips' ? (
              <section
                id="profile-tabpanel-clips"
                role="tabpanel"
                aria-labelledby="profile-tab-clips"
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border-muted pb-3">
                  <h2 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                    CLIPES DE @{profile.username}
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
                        aria-label="Página anterior de clipes"
                        className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-surface text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="Próxima página de clipes"
                        className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-surface text-text-secondary hover:border-success hover:text-text-primary disabled:opacity-45"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {clips.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
                    <Film className="h-10 w-10 text-text-muted" aria-hidden="true" />
                    <div className="space-y-1">
                      <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                        NENHUM CLIPE PÚBLICO ENCONTRADO
                      </h3>
                      <p className="font-mono text-mono-meta text-text-secondary">
                        Este jogador ainda não publicou clipes públicos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="public-profile-clips-grid"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {clips.map((clip) => (
                      <ProfileClipCard
                        key={clip.id}
                        id={clip.id}
                        slug={clip.slug}
                        title={clip.title}
                        thumbnailUrl={clip.thumbnail_url}
                        durationSeconds={clip.duration_seconds}
                        viewsCount={clip.views_count}
                        likesCount={clip.likes_count}
                        gameName={clip.game.name}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <ProfileCollectionsSection
                username={profile.username}
                isOwnProfile={isOwnProfile}
                isAuthenticated={Boolean(currentUser)}
                globalVisibility={globalVisibility}
                loadState={collectionsLoadState}
                collections={collections}
                page={collectionsPage}
                totalPages={collectionsTotalPages}
                errorMessage={collectionsError}
                onPageChange={setCollectionsPage}
                onRetry={() => void fetchProfileCollections()}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
