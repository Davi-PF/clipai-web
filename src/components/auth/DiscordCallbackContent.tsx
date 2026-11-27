'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { TwoFactorChallengeStep } from '@/components/auth/TwoFactorChallengeStep';
import { Button } from '@/components/ui/Button';
import { DiscordIcon } from '@/components/ui/DiscordBadge';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { acceptPendingInviteIfPresent } from '@/lib/pending-invite';
import { resolveChallengeToken } from '@/types/auth';

type CallbackViewState = 'loading' | 'challenge_2fa' | 'error';

export function DiscordCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, completeDiscordCallback } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const code = searchParams.get('code')?.trim() ?? '';
  const state = searchParams.get('state')?.trim() ?? '';
  const oauthError = searchParams.get('error')?.trim() ?? '';

  const [viewState, setViewState] = useState<CallbackViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null);

  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading || hasProcessedRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    if (oauthError) {
      const cancelledMessage =
        oauthError === 'access_denied'
          ? 'Autorização com o Discord cancelada pelo usuário.'
          : 'Não foi possível concluir a autorização no Discord.';
      setErrorMessage(cancelledMessage);
      setViewState('error');
      showErrorToast(cancelledMessage);
      return;
    }

    if (!code || !state) {
      const missingMessage = 'Código ou token de segurança (state) do Discord ausente na URL.';
      setErrorMessage(missingMessage);
      setViewState('error');
      showErrorToast(missingMessage);
      return;
    }

    async function processCallback() {
      try {
        const response = await completeDiscordCallback({ code, state });

        if (response.requires_2fa) {
          const token = resolveChallengeToken(response);
          if (!token) {
            setErrorMessage('Não foi possível iniciar o desafio de verificação em duas etapas.');
            setViewState('error');
            return;
          }
          setChallengeToken(token);
          setChallengeEmail(response.user?.email ?? null);
          setViewState('challenge_2fa');
          return;
        }

        if (response.mode === 'link') {
          success(response.message || 'Conta do Discord vinculada com sucesso!');
          router.replace('/settings?tab=connections');
          return;
        }

        success(response.message || 'Login com Discord realizado com sucesso!');
        const acceptedInvite = await acceptPendingInviteIfPresent();
        if (acceptedInvite) {
          success(
            acceptedInvite.message ||
              `Convite aceito! Você e @${acceptedInvite.inviter.username} agora são amigos.`,
          );
        }
        router.replace('/dashboard');
      } catch (err: unknown) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Código de autorização do Discord inválido ou expirado.';
        setErrorMessage(message);
        setViewState('error');
        showErrorToast(message);
      }
    }

    void processCallback();
  }, [
    code,
    state,
    oauthError,
    isAuthLoading,
    completeDiscordCallback,
    router,
    success,
    showErrorToast,
  ]);

  if (viewState === 'challenge_2fa' && challengeToken) {
    return (
      <AuthCardLayout
        title="VERIFICAÇÃO EM 2 ETAPAS (2FA)"
        subtitle="Sua conta Discord foi autenticada. Confirme o código de 6 dígitos para entrar."
      >
        <TwoFactorChallengeStep
          challengeToken={challengeToken}
          userEmail={challengeEmail}
          onSuccess={() => {
            void acceptPendingInviteIfPresent().then((acceptedInvite) => {
              if (acceptedInvite) {
                success(
                  acceptedInvite.message ||
                    `Convite aceito! Você e @${acceptedInvite.inviter.username} agora são amigos.`,
                );
              }
              router.replace('/dashboard');
            });
          }}
          onCancel={() => router.replace('/login')}
        />
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="CONECTANDO COM O DISCORD"
      subtitle="Validando a autorização OAuth2 com segurança no CLIPAÍ."
    >
      {viewState === 'loading' && (
        <div
          aria-busy="true"
          data-testid="discord-callback-loading"
          className="flex flex-col items-center gap-3.5 rounded-card border border-border-muted bg-bg-deep p-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-muted bg-bg-surface">
            <DiscordIcon className="h-6 w-6 text-success" />
          </div>
          <div className="flex items-center gap-2 font-mono text-mono-body text-text-primary">
            <Loader2 className="h-4 w-4 animate-spin text-success" aria-hidden="true" />
            <span>Autenticando sua conta Discord...</span>
          </div>
        </div>
      )}

      {viewState === 'error' && (
        <div className="space-y-5">
          <div
            role="alert"
            data-testid="discord-callback-error"
            className="flex items-start gap-3 rounded-card border border-danger bg-danger-surface p-4"
          >
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-text" aria-hidden="true" />
            <p className="font-mono text-mono-body text-danger-text">{errorMessage}</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link href="/settings?tab=connections" className="block">
                <Button type="button" variant="primary" fullWidth>
                  VOLTAR PARA CONFIGURAÇÕES
                </Button>
              </Link>
            ) : (
              <Link href="/login" className="block">
                <Button type="button" variant="primary" fullWidth>
                  VOLTAR PARA O LOGIN
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </AuthCardLayout>
  );
}
