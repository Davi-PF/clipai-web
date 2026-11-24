'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Gamepad2,
  Heart,
  Settings,
  UserX,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { formatDurationBadge } from '@/lib/validators';
import { userService } from '@/services/user-service';
import { getClipShareSlug, type ClipSummary } from '@/types/clip';
import { getUserDisplayName, type PublicUserProfile } from '@/types/user';

type ProfileLoadState = 'loading' | 'ready' | 'not_found' | 'error';

const CLIPS_PAGE_SIZE = 12;

export function PublicProfileView({ username }: Readonly<{ username: string }>) {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [loadState, setLoadState] = useState<ProfileLoadState>('loading');
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const isOwnProfile = Boolean(
    currentUser &&
    profile &&
    currentUser.username.trim().toLowerCase() === profile.username.trim().toLowerCase(),
  );

  const clipsCount = profile?.stats?.clips_count ?? profile?.clips_count ?? clips.length;
  const totalViews = profile?.stats?.total_views ?? profile?.total_views ?? 0;
  const totalLikes = profile?.stats?.total_likes ?? profile?.total_likes ?? 0;

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

            {/* Listagem de Clipes Públicos do Usuário */}
            <section className="space-y-4">
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
                    <Link
                      key={clip.id}
                      href={`/c/${getClipShareSlug(clip)}`}
                      className="group flex flex-col overflow-hidden rounded-card border border-border-muted bg-bg-surface transition-colors hover:border-success"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-bg-deep">
                        <img
                          src={clip.thumbnail_url}
                          alt={`Miniatura de ${clip.title}`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <span className="absolute bottom-2 right-2 rounded-control bg-bg-deep/90 px-2 py-0.5 font-mono text-mono-badge text-text-primary">
                          {formatDurationBadge(clip.duration_seconds)}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 rounded-control border border-border-muted bg-bg-deep px-2 py-0.5 font-mono text-mono-badge uppercase text-success">
                            <Gamepad2 className="h-3 w-3" aria-hidden="true" />
                            {clip.game.name}
                          </span>
                          <h3 className="line-clamp-2 font-mono text-mono-body font-semibold text-text-primary group-hover:text-success">
                            {clip.title}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between border-t border-border-muted pt-2.5 font-mono text-mono-badge text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            {clip.views_count} views
                          </span>
                          <span className="inline-flex items-center gap-1 text-danger">
                            <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            {clip.likes_count}
                          </span>
                        </div>
                      </div>
                    </Link>
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
