'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, UserPlus, UserX, Users } from 'lucide-react';
import { DiscordOAuthButton } from '@/components/auth/DiscordOAuthButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { clearPendingInviteCode, savePendingInviteCode } from '@/lib/pending-invite';
import { invitesService } from '@/services/invites-service';
import type { InvitePreview } from '@/types/invite';
import { getUserDisplayName } from '@/types/user';

type InviteLoadState = 'loading' | 'ready' | 'not_found' | 'error';

export function InviteLandingView({ code }: Readonly<{ code: string }>) {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [loadState, setLoadState] = useState<InviteLoadState>('loading');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const loadInvitePreview = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage(null);
    try {
      const data = await invitesService.getInvitePreview(code);
      setPreview(data);
      setLoadState('ready');
    } catch (err: unknown) {
      setPreview(null);
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
          : 'Não foi possível carregar os detalhes deste convite.',
      );
      setLoadState('error');
    }
  }, [code]);

  useEffect(() => {
    void loadInvitePreview();
  }, [loadInvitePreview]);

  useEffect(() => {
    if (loadState === 'ready' && !isAuthLoading && !isAuthenticated) {
      savePendingInviteCode(code);
    }
  }, [loadState, isAuthLoading, isAuthenticated, code]);

  const handleAcceptInvite = async () => {
    setIsAccepting(true);
    try {
      const response = await invitesService.acceptInvite(code);
      clearPendingInviteCode();
      success(
        response.message ||
          `Convite aceito! Você e @${response.inviter.username} agora são amigos.`,
      );
      router.push(`/u/${encodeURIComponent(response.inviter.username)}`);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível aceitar este convite. Tente novamente.';
      showErrorToast(message);
    } finally {
      setIsAccepting(false);
    }
  };

  const isOwnInvite = Boolean(
    currentUser &&
    preview &&
    currentUser.username.trim().toLowerCase() === preview.username.trim().toLowerCase(),
  );

  const encodedCode = encodeURIComponent(code);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-4 py-10 text-text-primary">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={isAuthenticated ? '/dashboard' : '/'}
            className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-surface px-3.5 py-2 font-mono text-mono-meta text-text-primary transition-colors hover:border-success"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>

          <Link href="/" className="inline-flex items-center">
            <BrandLogo variant="horizontal" size="md" showBeta />
          </Link>
        </div>

        {loadState === 'loading' && (
          <section
            aria-busy="true"
            aria-label="Carregando convite"
            className="space-y-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-8"
          >
            <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-bg-elevated" />
            <div className="mx-auto h-8 w-56 animate-pulse rounded-control bg-bg-elevated" />
            <div className="mx-auto h-12 w-full animate-pulse rounded-control bg-bg-elevated" />
          </section>
        )}

        {loadState === 'not_found' && (
          <section
            data-testid="invite-not-found"
            className="flex flex-col items-center gap-4 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-8 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-danger bg-danger-surface text-danger-text">
              <UserX className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                CONVITE INVÁLIDO OU EXPIRADO
              </h1>
              <p className="font-mono text-mono-body text-text-secondary">
                Não encontramos nenhum jogador associado ao código de convite informado. Peça um
                novo link na call ou DM do Discord.
              </p>
            </div>
            <Link href={isAuthenticated ? '/dashboard' : '/'} className="w-full sm:w-auto">
              <Button type="button" variant="primary" fullWidth>
                VOLTAR PARA O CLIPAÍ
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
            <Button type="button" variant="secondary" onClick={() => void loadInvitePreview()}>
              Tentar novamente
            </Button>
          </section>
        )}

        {loadState === 'ready' && preview && (
          <section
            data-testid="invite-valid-card"
            className="space-y-6 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/60 bg-bg-deep px-3 py-1 font-mono text-mono-badge uppercase text-success">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Convite de amizade
              </span>

              <UserAvatar
                username={preview.username}
                displayName={preview.display_name}
                avatarUrl={preview.avatar_url}
                size="xl"
              />

              <div className="space-y-1.5">
                <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                  {getUserDisplayName(preview)}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-control border border-border-muted bg-bg-deep px-2.5 py-0.5 font-mono text-mono-meta text-text-secondary">
                    @{preview.username}
                  </span>
                  {preview.discord_username && (
                    <DiscordBadge discordUsername={preview.discord_username} />
                  )}
                </div>
              </div>

              <p className="max-w-md font-mono text-mono-body text-text-secondary">
                <strong className="text-text-primary">{getUserDisplayName(preview)}</strong>{' '}
                convidou você para o CLIPAÍ. Entre pelo convite para virar amigo automaticamente e
                assistir clipes exclusivos da call.
              </p>
            </div>

            {isAuthLoading ? (
              <div className="h-12 w-full animate-pulse rounded-control bg-bg-elevated" />
            ) : isAuthenticated ? (
              isOwnInvite ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 rounded-card border border-warning bg-bg-deep p-3.5 font-mono text-mono-meta text-text-primary">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    <span>Este é o seu próprio link de convite. Compartilhe com seus amigos!</span>
                  </div>
                  <Link href="/friends" className="block">
                    <Button type="button" variant="primary" fullWidth>
                      IR PARA MEUS AMIGOS
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    data-testid="accept-invite-btn"
                    isLoading={isAccepting}
                    loadingText="ACEITANDO CONVITE..."
                    leftIcon={<UserPlus className="h-5 w-5" />}
                    onClick={() => void handleAcceptInvite()}
                  >
                    ACEITAR CONVITE E VIRAR AMIGO
                  </Button>
                  <p className="font-mono text-mono-badge text-text-muted">
                    Logado como{' '}
                    <strong className="text-text-primary">@{currentUser?.username}</strong>
                  </p>
                </div>
              )
            ) : (
              <div data-testid="invite-anonymous-actions" className="space-y-3">
                <Link
                  href={`/register?invite=${encodedCode}`}
                  onClick={() => savePendingInviteCode(code)}
                  className="block"
                >
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<UserPlus className="h-5 w-5" />}
                  >
                    CRIAR CONTA E ACEITAR
                  </Button>
                </Link>

                <DiscordOAuthButton mode="login" label="ENTRAR COM DISCORD" showDivider={false} />

                <Link
                  href={`/login?invite=${encodedCode}`}
                  onClick={() => savePendingInviteCode(code)}
                  className="block"
                >
                  <Button type="button" variant="secondary" typography="display" fullWidth>
                    JÁ TENHO CONTA
                  </Button>
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
