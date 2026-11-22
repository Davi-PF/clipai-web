'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DiscordBadge, DiscordIcon } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { userService } from '@/services/user-service';
import type { User } from '@/types/api';

export interface ConnectionsSettingsTabProps {
  user: User;
  onUserUpdated: (nextUser: User) => void;
}

export function ConnectionsSettingsTab({
  user,
  onUserUpdated,
}: Readonly<ConnectionsSettingsTabProps>) {
  const { success, error: showErrorToast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDiscordLinked = Boolean(user.discord_linked);
  const hasLocalPassword = user.has_password !== false;
  const discordAvatarUrl = user.discord_avatar_url ?? user.avatar_url;

  const handleLinkDiscord = async () => {
    setIsLinking(true);
    setErrorMessage(null);
    try {
      const response = await userService.getDiscordLinkUrl();
      const targetUrl = response.url || response.authorization_url;
      if (typeof window !== 'undefined' && targetUrl) {
        window.location.assign(targetUrl);
      }
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível iniciar a vinculação com o Discord.';
      setErrorMessage(message);
      showErrorToast(message);
      setIsLinking(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!hasLocalPassword) {
      return;
    }

    setIsUnlinking(true);
    setErrorMessage(null);
    try {
      const updatedUser = await userService.unlinkDiscord();
      onUserUpdated(updatedUser);
      success('Conta do Discord desvinculada com sucesso.');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível desvincular sua conta do Discord.';
      setErrorMessage(message);
      showErrorToast(message);
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div data-testid="settings-tab-connections" className="space-y-6">
      <section className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border-muted pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <DiscordIcon className="h-6 w-6 text-success" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                  DISCORD
                </h2>
                {isDiscordLinked ? (
                  <span
                    data-testid="discord-status-badge"
                    className="inline-flex items-center gap-1.5 rounded-control border border-success bg-success-surface px-2.5 py-0.5 font-mono text-mono-badge font-semibold text-success"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    Vinculado
                  </span>
                ) : (
                  <span
                    data-testid="discord-status-badge"
                    className="inline-flex items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep px-2.5 py-0.5 font-mono text-mono-badge text-text-secondary"
                  >
                    Não vinculado
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-mono-meta text-text-secondary">
                Conecte sua conta do Discord para login rápido, selo verificado no perfil e
                sincronização de avatar.
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isDiscordLinked ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-deep p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  username={user.discord_username || user.username}
                  displayName={user.discord_username || user.display_name}
                  avatarUrl={discordAvatarUrl}
                  size="lg"
                />
                <div className="space-y-1">
                  <p className="font-mono text-mono-body font-semibold text-text-primary">
                    {user.discord_username
                      ? `@${user.discord_username}`
                      : 'Conta Discord conectada'}
                  </p>
                  <DiscordBadge discordUsername={user.discord_username} />
                </div>
              </div>

              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Link2Off className="h-4 w-4" />}
                disabled={!hasLocalPassword || isUnlinking}
                isLoading={isUnlinking}
                loadingText="DESVINCULANDO..."
                onClick={() => void handleUnlinkDiscord()}
              >
                DESVINCULAR
              </Button>
            </div>

            {!hasLocalPassword && (
              <div
                role="note"
                data-testid="unlink-password-warning"
                className="flex items-start gap-2.5 rounded-card border border-warning bg-bg-deep p-3.5 font-mono text-mono-meta text-text-primary"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <span>
                  Você não possui uma senha local definida. Por segurança, o botão de desvincular
                  está desabilitado para evitar que você perca o acesso à sua conta. Defina uma
                  senha usando a recuperação de senha antes de desvincular o Discord.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-deep p-4 sm:flex-row sm:items-center">
            <p className="font-mono text-mono-meta text-text-secondary">
              Nenhuma conta do Discord conectada ao perfil <strong>@{user.username}</strong>.
            </p>

            <Button
              type="button"
              variant="primary"
              leftIcon={<DiscordIcon className="h-4 w-4" />}
              isLoading={isLinking}
              loadingText="REDIRECIONANDO..."
              onClick={() => void handleLinkDiscord()}
            >
              VINCULAR CONTA DISCORD
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
