'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Gamepad2,
  Globe,
  Link2,
  LogOut,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UploadClipModal } from '@/components/upload/UploadClipModal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { formatDurationBadge } from '@/lib/validators';
import { authService } from '@/services/auth-service';
import { clipsService } from '@/services/clips-service';
import type { Clip, ClipSummary, Game, PrivacyLevel } from '@/types/clip';

const PRIVACY_BADGE_MAP: Record<PrivacyLevel, { label: string; Icon: typeof Globe }> = {
  public: { label: 'Público', Icon: Globe },
  friends: { label: 'Só Amigos', Icon: Users },
  unlisted: { label: 'Não-listado', Icon: Link2 },
};

function ClipSummaryCard({ clip }: Readonly<{ clip: ClipSummary }>) {
  const privacyMeta = PRIVACY_BADGE_MAP[clip.privacy];
  const PrivacyIcon = privacyMeta.Icon;

  return (
    <Link
      href={`/c/${clip.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border-muted bg-bg-deep transition-colors hover:border-success"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-bg-surface">
        <img
          src={clip.thumbnail_url}
          alt={`Capa do clipe ${clip.title}`}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <span className="absolute bottom-2 right-2 rounded-control bg-bg-deep/90 px-2 py-0.5 font-mono text-mono-badge text-text-primary">
          {formatDurationBadge(clip.duration_seconds)}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-control border border-border-muted bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-success">
              <Gamepad2 className="h-3 w-3" aria-hidden="true" />
              {clip.game.name}
            </span>
            <span className="inline-flex items-center gap-1 rounded-control border border-border-muted bg-bg-elevated px-2 py-0.5 font-mono text-mono-badge text-text-secondary">
              <PrivacyIcon className="h-3 w-3" aria-hidden="true" />
              {privacyMeta.label}
            </span>
          </div>

          <h3 className="line-clamp-1 font-display text-display-md uppercase tracking-[0.06em] text-text-primary group-hover:text-success">
            {clip.title}
          </h3>
        </div>

        <div className="flex items-center justify-between font-mono text-mono-badge text-text-muted">
          <span>@{clip.author.username}</span>
          <span>{clip.views_count} views</span>
        </div>
      </div>
    </Link>
  );
}

function ProvisionalDashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [games, setGames] = useState<Game[]>([]);
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [isLoadingClips, setIsLoadingClips] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selectedGameId, setSelectedGameId] = useState('');

  const loadClips = useCallback(async (queryText: string, gameFilterId: string) => {
    setIsLoadingClips(true);
    try {
      const response = await clipsService.listClips({
        q: queryText || undefined,
        game_id: gameFilterId || undefined,
        page_size: 12,
      });
      setClips(response.items);
    } catch {
      setClips([]);
    } finally {
      setIsLoadingClips(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    void clipsService
      .listGames({ page_size: 50 })
      .then((res) => {
        if (isActive) setGames(res.items);
      })
      .catch(() => {
        if (isActive) setGames([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    void loadClips(appliedQuery, selectedGameId);
  }, [loadClips, appliedQuery, selectedGameId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      success('Você saiu da sua conta com segurança.');
      router.replace('/login');
    } catch {
      showErrorToast('Erro ao encerrar a sessão.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) {
      return;
    }
    setIsResendingVerification(true);
    try {
      const response = await authService.resendVerification(user.email);
      success(response.message);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível reenviar o e-mail de verificação.';
      showErrorToast(message);
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedQuery(searchInput.trim());
  };

  const handleUploadSuccess = (newClip: Clip) => {
    setClips((prev) => [newClip, ...prev.filter((item) => item.id !== newClip.id)]);
  };

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-bg-deep px-4 py-8 text-text-primary md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <Film className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                  CLIPAÍ
                </h1>
                <span className="rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
                  BETA
                </span>
                <span className="rounded-control border border-border-muted bg-bg-elevated px-2 py-0.5 font-mono text-mono-badge uppercase text-text-secondary">
                  DASHBOARD PROVISÓRIO • SPRINT 2
                </span>
              </div>
              <p className="font-mono text-mono-meta text-text-secondary">
                Upload direto para Cloudflare R2 e visualização compartilhável em /c/[slug]
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              + ENVIAR CLIPE
            </Button>

            <Button
              type="button"
              variant="danger"
              size="md"
              isLoading={isLoggingOut}
              loadingText="SAINDO..."
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={() => void handleLogout()}
            >
              SAIR
            </Button>
          </div>
        </header>

        <section
          aria-labelledby="heading-session-user"
          className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
              <h2
                id="heading-session-user"
                className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
              >
                DADOS DA CONTA AUTENTICADA
              </h2>
            </div>

            {user.is_email_verified ? (
              <span
                data-testid="email-verified-badge"
                className="inline-flex items-center gap-1.5 rounded-control border border-success bg-success-surface px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                E-MAIL VERIFICADO
              </span>
            ) : (
              <span
                data-testid="email-pending-badge"
                className="inline-flex items-center gap-1.5 rounded-control border border-warning bg-bg-deep px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-warning"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                E-MAIL NÃO VERIFICADO
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-border-muted bg-bg-deep p-4">
              <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                USERNAME
              </span>
              <p className="mt-1.5 font-mono text-mono-body font-semibold text-text-primary">
                @{user.username}
              </p>
            </div>

            <div className="rounded-card border border-border-muted bg-bg-deep p-4">
              <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                NOME DE EXIBIÇÃO
              </span>
              <p className="mt-1.5 font-mono text-mono-body font-semibold text-text-primary">
                {user.display_name}
              </p>
            </div>

            <div className="rounded-card border border-border-muted bg-bg-deep p-4">
              <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                E-MAIL
              </span>
              <p className="mt-1.5 truncate font-mono text-mono-body font-semibold text-text-primary">
                {user.email}
              </p>
            </div>
          </div>

          {!user.is_email_verified && (
            <div className="mt-5 flex flex-col justify-between gap-4 rounded-card border border-warning bg-bg-deep p-4 sm:flex-row sm:items-center">
              <p className="font-mono text-mono-meta text-text-secondary">
                Confirme seu e-mail para liberar o envio de clipes e criação de coleções.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={isResendingVerification}
                loadingText="Reenviando..."
                onClick={() => void handleResendVerification()}
              >
                Reenviar verificação
              </Button>
            </div>
          )}
        </section>

        {/* Seção de Clipes (Sprint 2) */}
        <section
          aria-labelledby="heading-clips-gallery"
          className="space-y-5 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h2
              id="heading-clips-gallery"
              className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
            >
              CLIPES RECENTES
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="flex h-10 items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-3 focus-within:border-success">
                  <Search className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Buscar clipes..."
                    aria-label="Buscar clipes"
                    className="w-44 bg-transparent font-mono text-mono-meta text-text-primary placeholder:text-text-muted focus:outline-none sm:w-56"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
              </form>

              <select
                value={selectedGameId}
                onChange={(event) => setSelectedGameId(event.target.value)}
                aria-label="Filtrar por jogo"
                className="h-10 rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-meta text-text-primary focus:border-success focus:outline-none"
              >
                <option value="">Todos os jogos</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingClips && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-60 animate-pulse rounded-card border border-border-muted bg-bg-elevated"
                />
              ))}
            </div>
          )}

          {!isLoadingClips && clips.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep p-10 text-center">
              <Film className="h-10 w-10 text-text-muted" aria-hidden="true" />
              <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                NENHUM CLIPE ENCONTRADO
              </h3>
              <p className="font-mono text-mono-meta text-text-secondary">
                {appliedQuery || selectedGameId
                  ? 'Tente limpar os filtros ou buscar por outro termo.'
                  : 'Envie seu primeiro clipe agora mesmo para gerar um link compartilhável.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                {(appliedQuery || selectedGameId) && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchInput('');
                      setAppliedQuery('');
                      setSelectedGameId('');
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  ENVIAR PRIMEIRO CLIPE
                </Button>
              </div>
            </div>
          )}

          {!isLoadingClips && clips.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip) => (
                <ClipSummaryCard key={clip.id} clip={clip} />
              ))}
            </div>
          )}
        </section>
      </div>

      <UploadClipModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </main>
  );
}

export default function ProvisionalDashboardPage() {
  return (
    <AuthGuard>
      <ProvisionalDashboardContent />
    </AuthGuard>
  );
}
