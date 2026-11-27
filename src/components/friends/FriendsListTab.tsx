'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { FriendItem } from '@/types/friendship';
import { getUserDisplayName } from '@/types/user';

export interface FriendsListTabProps {
  friends: FriendItem[];
  isLoading: boolean;
  pendingFriendshipId: string | null;
  onRemoveFriend: (item: FriendItem) => Promise<void>;
  onSwitchToSearch: () => void;
}

function formatSinceDatePtBr(isoDate: string): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function FriendsListTab({
  friends,
  isLoading,
  pendingFriendshipId,
  onRemoveFriend,
  onSwitchToSearch,
}: Readonly<FriendsListTabProps>) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div aria-busy="true" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-24 animate-pulse rounded-card border border-border-muted bg-bg-surface"
          />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div
        data-testid="friends-empty-state"
        className="flex flex-col items-center gap-3 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center"
      >
        <Users className="h-10 w-10 text-text-muted" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            VOCÊ AINDA NÃO TEM AMIGOS ADICIONADOS
          </h3>
          <p className="font-mono text-mono-meta text-text-secondary">
            Compartilhe seu link de convite acima ou busque jogadores pelo @username ou Discord.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={onSwitchToSearch}>
          BUSCAR PESSOAS
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="friends-list-grid" className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {friends.map((item) => {
        const displayName = getUserDisplayName(item.user);
        const profileHref = `/u/${encodeURIComponent(item.user.username)}`;
        const isPending = pendingFriendshipId === item.friendship_id;
        const isConfirming = confirmingId === item.friendship_id;
        const sinceLabel = formatSinceDatePtBr(item.since);

        return (
          <article
            key={item.friendship_id}
            data-testid={`friend-card-${item.user.username}`}
            className="flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-surface p-4 transition-colors hover:border-text-secondary sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Link href={profileHref} className="shrink-0">
                <UserAvatar
                  username={item.user.username}
                  displayName={item.user.display_name}
                  avatarUrl={item.user.avatar_url}
                  size="md"
                />
              </Link>

              <div className="min-w-0 space-y-1">
                <Link
                  href={profileHref}
                  className="block truncate font-mono text-mono-body font-semibold text-text-primary transition-colors hover:text-success"
                >
                  {displayName}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-mono text-mono-badge text-text-secondary">
                    @{item.user.username}
                  </span>
                  {item.user.discord_linked && (
                    <DiscordBadge discordUsername={item.user.discord_username} />
                  )}
                </div>
                {sinceLabel && (
                  <p className="font-mono text-mono-badge text-text-muted">
                    Amigos desde {sinceLabel}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={profileHref}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border-muted bg-bg-elevated px-3 py-1.5 font-mono text-mono-badge text-text-primary transition-colors hover:border-success"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ver perfil</span>
              </Link>

              {isConfirming ? (
                <div className="inline-flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={isPending}
                    loadingText="REMOVENDO..."
                    onClick={() => {
                      void onRemoveFriend(item).finally(() => setConfirmingId(null));
                    }}
                  >
                    CONFIRMAR
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  aria-label={`Desfazer amizade com @${item.user.username}`}
                  onClick={() => setConfirmingId(item.friendship_id)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep px-3 py-1.5 font-mono text-mono-badge text-danger-text transition-colors hover:border-danger hover:bg-danger-surface hover:text-text-primary disabled:opacity-50"
                >
                  <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Remover</span>
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
