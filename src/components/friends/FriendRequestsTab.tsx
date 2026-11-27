'use client';

import Link from 'next/link';
import { Check, Clock, Inbox, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { FriendRequest } from '@/types/friendship';
import { getUserDisplayName } from '@/types/user';

export interface FriendRequestsTabProps {
  received: FriendRequest[];
  sent: FriendRequest[];
  isLoading: boolean;
  pendingFriendshipId: string | null;
  onAcceptRequest: (request: FriendRequest) => Promise<void>;
  onDeclineRequest: (request: FriendRequest) => Promise<void>;
  onCancelSentRequest: (request: FriendRequest) => Promise<void>;
}

export function FriendRequestsTab({
  received,
  sent,
  isLoading,
  pendingFriendshipId,
  onAcceptRequest,
  onDeclineRequest,
  onCancelSentRequest,
}: Readonly<FriendRequestsTabProps>) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-4">
        {[1, 2].map((idx) => (
          <div
            key={idx}
            className="h-24 animate-pulse rounded-card border border-border-muted bg-bg-surface"
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="friend-requests-tab" className="space-y-6">
      {/* Seção: Pedidos Recebidos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border-muted pb-2">
          <Inbox className="h-4 w-4 text-success" aria-hidden="true" />
          <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            RECEBIDOS
          </h3>
          <span className="rounded-control border border-border-muted bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-text-secondary">
            {received.length}
          </span>
        </div>

        {received.length === 0 ? (
          <div className="rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-surface p-6 text-center font-mono text-mono-meta text-text-secondary">
            Nenhum pedido de amizade recebido no momento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {received.map((req) => {
              const displayName = getUserDisplayName(req.user);
              const profileHref = `/u/${encodeURIComponent(req.user.username)}`;
              const isPending = pendingFriendshipId === req.friendship_id;

              return (
                <article
                  key={req.friendship_id}
                  data-testid={`received-request-${req.user.username}`}
                  className="flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-surface p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Link href={profileHref} className="shrink-0">
                      <UserAvatar
                        username={req.user.username}
                        displayName={req.user.display_name}
                        avatarUrl={req.user.avatar_url}
                        size="md"
                      />
                    </Link>
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={profileHref}
                        className="block truncate font-mono text-mono-body font-semibold text-text-primary hover:text-success"
                      >
                        {displayName}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-mono-badge text-text-secondary">
                          @{req.user.username}
                        </span>
                        {req.user.discord_linked && (
                          <DiscordBadge discordUsername={req.user.discord_username} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={isPending}
                      loadingText="ACEITANDO..."
                      leftIcon={<Check className="h-4 w-4" />}
                      onClick={() => void onAcceptRequest(req)}
                    >
                      ACEITAR
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      typography="display"
                      disabled={isPending}
                      leftIcon={<X className="h-4 w-4" />}
                      onClick={() => void onDeclineRequest(req)}
                      className="border border-danger/70 text-danger-text hover:border-danger hover:bg-danger-surface hover:text-text-primary"
                    >
                      RECUSAR
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Seção: Pedidos Enviados */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border-muted pb-2">
          <Send className="h-4 w-4 text-warning" aria-hidden="true" />
          <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            ENVIADOS
          </h3>
          <span className="rounded-control border border-border-muted bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-text-secondary">
            {sent.length}
          </span>
        </div>

        {sent.length === 0 ? (
          <div className="rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-surface p-6 text-center font-mono text-mono-meta text-text-secondary">
            Você não possui pedidos de amizade pendentes enviados.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sent.map((req) => {
              const displayName = getUserDisplayName(req.user);
              const profileHref = `/u/${encodeURIComponent(req.user.username)}`;
              const isPending = pendingFriendshipId === req.friendship_id;

              return (
                <article
                  key={req.friendship_id}
                  data-testid={`sent-request-${req.user.username}`}
                  className="flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-surface p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Link href={profileHref} className="shrink-0">
                      <UserAvatar
                        username={req.user.username}
                        displayName={req.user.display_name}
                        avatarUrl={req.user.avatar_url}
                        size="md"
                      />
                    </Link>
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={profileHref}
                        className="block truncate font-mono text-mono-body font-semibold text-text-primary hover:text-success"
                      >
                        {displayName}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-mono-badge text-text-secondary">
                          @{req.user.username}
                        </span>
                        {req.user.discord_linked && (
                          <DiscordBadge discordUsername={req.user.discord_username} />
                        )}
                        <span className="inline-flex items-center gap-1 font-mono text-mono-badge text-warning">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          Aguardando resposta
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    isLoading={isPending}
                    loadingText="Cancelando..."
                    leftIcon={<X className="h-4 w-4 text-danger-text" />}
                    onClick={() => void onCancelSentRequest(req)}
                  >
                    Cancelar pedido
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
