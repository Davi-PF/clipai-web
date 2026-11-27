'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DiscordBadge } from '@/components/ui/DiscordBadge';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { friendsService } from '@/services/friends-service';
import type { SearchFriendshipStatus, UserSearchItem } from '@/types/friendship';
import { getUserDisplayName } from '@/types/user';

const SEARCH_DEBOUNCE_MS = 300;

export interface UserSearchTabProps {
  onFriendshipMutated: () => void;
}

export function UserSearchTab({ onFriendshipMutated }: Readonly<UserSearchTabProps>) {
  const { success, error: showErrorToast } = useToast();

  const [queryInput, setQueryInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<UserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = queryInput.trim();
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);
    setSearchError(null);

    void friendsService
      .searchUsers({ q: debouncedQuery, page: 1, page_size: 20 })
      .then((res) => {
        if (!isActive) return;
        setResults(res.items);
        setHasSearched(true);
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        setResults([]);
        setHasSearched(true);
        setSearchError(
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível pesquisar jogadores no momento.',
        );
      })
      .finally(() => {
        if (isActive) {
          setIsSearching(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [debouncedQuery]);

  const patchResultStatus = (
    userId: string,
    friendship_status: SearchFriendshipStatus,
    friendship_id: string | null,
  ) => {
    setResults((prev) =>
      prev.map((item) =>
        item.id === userId ? { ...item, friendship_status, friendship_id } : item,
      ),
    );
  };

  const handleAddFriend = async (item: UserSearchItem) => {
    setBusyUserId(item.id);
    try {
      const res = await friendsService.sendRequest(item.id);
      const nextStatus: SearchFriendshipStatus =
        res.auto_accepted || res.status === 'accepted' ? 'accepted' : 'pending_sent';
      patchResultStatus(item.id, nextStatus, res.friendship_id);
      success(
        res.message ||
          (nextStatus === 'accepted'
            ? `Você e @${item.username} agora são amigos!`
            : `Pedido enviado para @${item.username}.`),
      );
      onFriendshipMutated();
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível enviar o pedido de amizade.',
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAcceptRequest = async (item: UserSearchItem) => {
    if (!item.friendship_id) return;
    setBusyUserId(item.id);
    try {
      const res = await friendsService.acceptRequest(item.friendship_id);
      patchResultStatus(item.id, 'accepted', res.friendship_id);
      success(res.message || `Pedido de @${item.username} aceito!`);
      onFriendshipMutated();
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError ? err.message : 'Não foi possível aceitar o pedido.',
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (item: UserSearchItem, message: string) => {
    if (!item.friendship_id) return;
    setBusyUserId(item.id);
    try {
      await friendsService.removeFriendship(item.friendship_id);
      patchResultStatus(item.id, 'none', null);
      success(message);
      onFriendshipMutated();
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError ? err.message : 'Não foi possível atualizar o pedido.',
      );
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div data-testid="user-search-tab" className="space-y-4">
      <div className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4">
        <Input
          label="Buscar jogadores"
          type="search"
          name="friends_search"
          placeholder="Buscar por @username, nome ou @discord..."
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {isSearching && (
        <div aria-busy="true" className="space-y-2.5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-20 animate-pulse rounded-card border border-border-muted bg-bg-surface"
            />
          ))}
        </div>
      )}

      {!isSearching && searchError && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-surface p-4 font-mono text-mono-meta text-danger-text"
        >
          {searchError}
        </div>
      )}

      {!isSearching && !searchError && !hasSearched && (
        <div className="flex flex-col items-center gap-2 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center">
          <Search className="h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            ENCONTRE SEUS AMIGOS DA CALL
          </p>
          <p className="font-mono text-mono-meta text-text-secondary">
            Digite o @username, nome de exibição ou usuário do Discord para buscar e adicionar.
          </p>
        </div>
      )}

      {!isSearching && !searchError && hasSearched && results.length === 0 && (
        <div
          data-testid="search-empty-state"
          className="flex flex-col items-center gap-2 rounded-bento border-[1.5px] border-dashed border-border-muted bg-bg-surface p-10 text-center"
        >
          <Search className="h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            NENHUM JOGADOR ENCONTRADO
          </p>
          <p className="font-mono text-mono-meta text-text-secondary">
            Nenhum perfil corresponde à busca por &ldquo;{debouncedQuery}&rdquo;.
          </p>
        </div>
      )}

      {!isSearching && !searchError && results.length > 0 && (
        <div data-testid="user-search-results" className="space-y-2.5">
          {results.map((item) => {
            const displayName = getUserDisplayName(item);
            const profileHref = `/u/${encodeURIComponent(item.username)}`;
            const isBusy = busyUserId === item.id;

            return (
              <article
                key={item.id}
                data-testid={`search-result-${item.username}`}
                className="flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-surface p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Link href={profileHref} className="shrink-0">
                    <UserAvatar
                      username={item.username}
                      displayName={item.display_name}
                      avatarUrl={item.avatar_url}
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
                        @{item.username}
                      </span>
                      {item.discord_linked && (
                        <DiscordBadge discordUsername={item.discord_username} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {item.friendship_status === 'none' && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={isBusy}
                      loadingText="ENVIANDO..."
                      leftIcon={<UserPlus className="h-4 w-4" />}
                      onClick={() => void handleAddFriend(item)}
                    >
                      + ADICIONAR AMIGO
                    </Button>
                  )}

                  {item.friendship_status === 'pending_sent' && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      leftIcon={<Clock className="h-4 w-4 text-warning" />}
                      onClick={() => void handleRemove(item, 'Pedido de amizade cancelado.')}
                    >
                      Cancelar pedido
                    </Button>
                  )}

                  {item.friendship_status === 'pending_received' && (
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isBusy}
                        loadingText="ACEITANDO..."
                        leftIcon={<Check className="h-4 w-4" />}
                        onClick={() => void handleAcceptRequest(item)}
                      >
                        ACEITAR
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        typography="display"
                        disabled={isBusy}
                        leftIcon={<X className="h-4 w-4" />}
                        onClick={() => void handleRemove(item, 'Pedido de amizade recusado.')}
                        className="border border-danger/70 text-danger-text hover:border-danger hover:bg-danger-surface hover:text-text-primary"
                      >
                        RECUSAR
                      </Button>
                    </>
                  )}

                  {item.friendship_status === 'accepted' && (
                    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-success bg-success-surface px-3 py-1.5 font-display text-display-cta uppercase tracking-[0.06em] text-text-primary">
                      <UserCheck className="h-4 w-4 text-success" aria-hidden="true" />
                      AMIGOS ✓
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
