'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookmarkPlus,
  Calendar,
  Copy,
  Edit3,
  Eye,
  Film,
  Gamepad2,
  Globe,
  Heart,
  Link2,
  Lock,
  Star,
  Trash2,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal';
import { ClipPlayer } from '@/components/player/ClipPlayer';
import { DeleteClipDialog } from '@/components/player/DeleteClipDialog';
import { EditClipModal } from '@/components/player/EditClipModal';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { useClipSocial, type SocialMutationPatch } from '@/hooks/useClipSocial';
import { ApiClientError } from '@/lib/api-client';
import { formatDurationBadge, formatFileSizeMb } from '@/lib/validators';
import { clipsService } from '@/services/clips-service';
import { isClipFavorited, isClipLiked, type Clip, type PrivacyLevel } from '@/types/clip';

type DetailLoadState = 'loading' | 'ready' | 'not_found' | 'restricted' | 'error';

const PRIVACY_LABELS: Record<PrivacyLevel, { label: string; Icon: typeof Globe }> = {
  public: { label: 'Público', Icon: Globe },
  friends: { label: 'Só Amigos', Icon: Users },
  unlisted: { label: 'Não-listado', Icon: Link2 },
};

function formatCreatedDatePtBr(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export function ClipDetailView({ slug }: Readonly<{ slug: string }>) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { success, error: showErrorToast, warning } = useToast();

  const [loadState, setLoadState] = useState<DetailLoadState>('loading');
  const [clip, setClip] = useState<Clip | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const hasRegisteredViewRef = useRef(false);

  const patchClip = useCallback((clipId: string, patch: SocialMutationPatch) => {
    setClip((prev) => (prev?.id === clipId ? { ...prev, ...patch } : prev));
  }, []);

  const { toggleLike, toggleFavorite, isLikePending, isFavoritePending } = useClipSocial(patchClip);

  const fetchClip = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage(null);

    try {
      const data = await clipsService.getClipBySlug(slug);
      setClip(data);
      setLoadState('ready');
    } catch (err: unknown) {
      setClip(null);
      if (err instanceof ApiClientError) {
        if (err.status === 404 || err.code === 'RESOURCE_NOT_FOUND') {
          setLoadState('not_found');
          return;
        }
        if (err.status === 401 || err.status === 403) {
          setLoadState('restricted');
          setErrorMessage(err.message);
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível carregar o clipe solicitado.');
      }
      setLoadState('error');
    }
  }, [slug]);

  useEffect(() => {
    if (!isAuthLoading) {
      void fetchClip();
    }
  }, [fetchClip, isAuthLoading]);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/c/${slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      success('Link copiado!');
    } catch {
      showErrorToast('Não foi possível copiar o link automaticamente.');
    }
  };

  const handleRegisterView = useCallback(() => {
    if (!clip || hasRegisteredViewRef.current) return;
    hasRegisteredViewRef.current = true;
    void clipsService
      .registerView(clip.id)
      .then((res) => {
        setClip((prev) => (prev ? { ...prev, views_count: res.views_count } : prev));
      })
      .catch(() => {
        hasRegisteredViewRef.current = false;
      });
  }, [clip]);

  const handleSocialAction = (action: () => void) => {
    if (!user) {
      warning('Faça login para curtir, favoritar ou salvar em coleções.');
      return;
    }
    action();
  };

  const handleConfirmDelete = async () => {
    if (!clip) return;
    setIsDeleting(true);
    try {
      await clipsService.deleteClip(clip.id);
      success('Clipe excluído com sucesso.');
      setIsDeleteOpen(false);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof ApiClientError ? err.message : 'Erro ao excluir o clipe.';
      showErrorToast(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = Boolean(user && clip && user.id === clip.author.id);
  const liked = clip ? isClipLiked(clip) : false;
  const favorited = clip ? isClipFavorited(clip) : false;
  const clipDetailPath = `/c/${slug}`;
  const loginRedirectHref = `/login?redirect=${encodeURIComponent(clipDetailPath)}`;

  return (
    <main className="min-h-screen bg-bg-deep px-4 py-8 text-text-primary md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={user ? '/dashboard' : '/'}
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
          <section aria-busy="true" aria-label="Carregando clipe" className="space-y-5">
            <div className="aspect-video w-full animate-pulse rounded-bento border border-border-muted bg-bg-surface" />
            <div className="space-y-3 rounded-bento border border-border-muted bg-bg-surface p-6">
              <div className="h-8 w-2/3 animate-pulse rounded-control bg-bg-elevated" />
              <div className="h-4 w-1/2 animate-pulse rounded-control bg-bg-elevated" />
              <div className="h-4 w-full animate-pulse rounded-control bg-bg-elevated" />
            </div>
          </section>
        )}

        {loadState === 'not_found' && (
          <section className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
            <Film className="h-12 w-12 text-text-muted" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                CLIPE NÃO ENCONTRADO
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">
                Este link pode ter sido removido pelo autor ou não existe mais.
              </p>
            </div>
            <Link href={user ? '/dashboard' : '/'}>
              <Button type="button" variant="primary">
                VOLTAR PARA O INÍCIO
              </Button>
            </Link>
          </section>
        )}

        {loadState === 'restricted' && (
          <section className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-warning bg-bg-surface p-10 text-center">
            <Lock className="h-12 w-12 text-warning" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                CLIPE RESTRITO A AMIGOS
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">
                {errorMessage ??
                  'Este clipe possui privacidade restrita. Entre com sua conta autorizada para assistir.'}
              </p>
            </div>
            {!user && (
              <Link href={loginRedirectHref}>
                <Button type="button" variant="primary">
                  FAZER LOGIN PARA ASSISTIR
                </Button>
              </Link>
            )}
          </section>
        )}

        {loadState === 'error' && (
          <section
            role="alert"
            className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-danger bg-danger-surface p-8 text-center"
          >
            <p className="font-mono text-mono-body text-danger-text">{errorMessage}</p>
            <Button type="button" variant="secondary" onClick={() => void fetchClip()}>
              Tentar novamente
            </Button>
          </section>
        )}

        {loadState === 'ready' && clip && (
          <>
            <ClipPlayer
              clipId={clip.id}
              src={clip.video_url}
              poster={clip.thumbnail_url}
              title={clip.title}
              initialDuration={clip.duration_seconds}
              resolutionLabel={clip.technical_metadata.resolution_label}
              onPlayStart={handleRegisterView}
              onQualifiedView={handleRegisterView}
            />

            <section className="space-y-5 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-4 border-b border-border-muted pb-5 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge uppercase text-success">
                      <Gamepad2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{clip.game.name}</span>
                    </span>

                    {(() => {
                      const PrivacyMeta = PRIVACY_LABELS[clip.privacy];
                      const PrivacyIcon = PrivacyMeta.Icon;
                      return (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border-muted bg-bg-elevated px-2.5 py-1 font-mono text-mono-badge uppercase text-text-primary">
                          <PrivacyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {PrivacyMeta.label}
                        </span>
                      );
                    })()}
                  </div>

                  <h1 className="break-words font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                    {clip.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                  <button
                    type="button"
                    disabled={isLikePending(clip.id)}
                    aria-pressed={liked}
                    aria-label={liked ? 'Remover curtida' : 'Curtir clipe'}
                    onClick={() => handleSocialAction(() => void toggleLike(clip))}
                    className={`inline-flex h-11 items-center gap-2 rounded-control border px-3.5 font-mono text-mono-meta transition-colors ${
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
                    disabled={isFavoritePending(clip.id)}
                    aria-pressed={favorited}
                    aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar clipe'}
                    onClick={() => handleSocialAction(() => void toggleFavorite(clip))}
                    className={`inline-flex h-11 items-center gap-2 rounded-control border px-3.5 font-mono text-mono-meta transition-colors ${
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

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    leftIcon={<BookmarkPlus className="h-4 w-4" />}
                    onClick={() => handleSocialAction(() => setIsCollectionModalOpen(true))}
                  >
                    Salvar em Coleção
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    leftIcon={<Copy className="h-4 w-4" />}
                    onClick={() => void handleCopyLink()}
                  >
                    COPIAR LINK
                  </Button>

                  {isOwner && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<Edit3 className="h-4 w-4" />}
                        onClick={() => setIsEditOpen(true)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="md"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setIsDeleteOpen(true)}
                      >
                        EXCLUIR
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {clip.description && (
                <p className="break-words whitespace-pre-line font-mono text-mono-body text-text-secondary">
                  {clip.description}
                </p>
              )}

              {clip.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {clip.tags.map((tag) => (
                    <span
                      key={tag}
                      className="max-w-full break-all rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge text-text-secondary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 border-t border-border-muted pt-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0 rounded-card bg-bg-deep p-3.5">
                  <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                    <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    AUTOR
                  </span>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <UserAvatar
                      username={clip.author.username}
                      displayName={clip.author.display_name}
                      avatarUrl={clip.author.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        href={`/u/${clip.author.username}`}
                        className="block truncate font-mono text-mono-body font-semibold text-text-primary transition-colors hover:text-success"
                      >
                        {clip.author.display_name} (@{clip.author.username})
                      </Link>
                      {clip.author.discord_linked && (
                        <DiscordBadge discordUsername={clip.author.discord_username} compact />
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-card bg-bg-deep p-3.5">
                  <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    PUBLICADO EM
                  </span>
                  <p className="mt-1 font-mono text-mono-body font-semibold text-text-primary">
                    {formatCreatedDatePtBr(clip.created_at)}
                  </p>
                </div>

                <div className="min-w-0 rounded-card bg-bg-deep p-3.5">
                  <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    ENGAJAMENTO
                  </span>
                  <p className="mt-1 flex items-center gap-3 font-mono text-mono-body font-semibold text-text-primary">
                    <span>{clip.views_count} views</span>
                    <span className="inline-flex items-center gap-1 text-danger">
                      <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {clip.likes_count}
                    </span>
                  </p>
                </div>

                <div className="min-w-0 rounded-card bg-bg-deep p-3.5">
                  <span className="block font-mono text-mono-badge uppercase text-text-muted">
                    METADADOS TÉCNICOS
                  </span>
                  <p className="mt-1 font-mono text-mono-body font-semibold text-success">
                    {clip.technical_metadata.resolution_label} •{' '}
                    {formatDurationBadge(clip.duration_seconds)} •{' '}
                    {formatFileSizeMb(clip.file_size_bytes)}
                  </p>
                </div>
              </div>
            </section>

            <EditClipModal
              clip={clip}
              isOpen={isEditOpen}
              onClose={() => setIsEditOpen(false)}
              onUpdated={(updated) => setClip(updated)}
            />

            <DeleteClipDialog
              isOpen={isDeleteOpen}
              clipTitle={clip.title}
              isDeleting={isDeleting}
              onCancel={() => setIsDeleteOpen(false)}
              onConfirm={() => void handleConfirmDelete()}
            />

            <AddToCollectionModal
              clipId={clip.id}
              clipTitle={clip.title}
              isOpen={isCollectionModalOpen}
              onClose={() => setIsCollectionModalOpen(false)}
            />
          </>
        )}
      </div>
    </main>
  );
}
