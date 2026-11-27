'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search, Users } from 'lucide-react';
import { LiquidSidebar, type DashboardSection } from '@/components/dashboard/LiquidSidebar';
import { FriendRequestsTab } from '@/components/friends/FriendRequestsTab';
import { FriendsListTab } from '@/components/friends/FriendsListTab';
import { InviteLinkCard } from '@/components/friends/InviteLinkCard';
import { UserSearchTab } from '@/components/friends/UserSearchTab';
import { useSidebarState } from '@/contexts/sidebar-context';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { friendsService } from '@/services/friends-service';
import { invitesService } from '@/services/invites-service';
import type { FriendItem, FriendRequest } from '@/types/friendship';
import type { MyInviteResponse } from '@/types/invite';

type FriendsTabId = 'friends' | 'requests' | 'search';

export function FriendsWorkspace() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success, error: showErrorToast } = useToast();
  const {
    isCollapsed: isSidebarCollapsed,
    toggleCollapsed: toggleSidebarCollapsed,
    setActiveSection,
  } = useSidebarState();

  const [activeTab, setActiveTab] = useState<FriendsTabId>('friends');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [myInvite, setMyInvite] = useState<MyInviteResponse | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const [pendingFriendshipId, setPendingFriendshipId] = useState<string | null>(null);

  const loadMyInvite = useCallback(async () => {
    setIsLoadingInvite(true);
    try {
      const invite = await invitesService.getMyInvite();
      setMyInvite(invite);
    } catch {
      setMyInvite(null);
    } finally {
      setIsLoadingInvite(false);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    try {
      const res = await friendsService.listFriends({ page: 1, page_size: 50 });
      setFriends(res.items);
    } catch {
      setFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await friendsService.listRequests();
      setReceivedRequests(res.received);
      setSentRequests(res.sent);
    } catch {
      setReceivedRequests([]);
      setSentRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    void loadMyInvite();
    void loadFriends();
    void loadRequests();
  }, [loadMyInvite, loadFriends, loadRequests]);

  const handleSelectSection = (section: DashboardSection) => {
    if (section === 'friends') {
      return;
    }
    if (section === 'studio') {
      router.push('/studio');
      return;
    }
    if (section === 'settings') {
      router.push('/settings');
      return;
    }
    setActiveSection(section);
    router.push(section === 'home' ? '/dashboard' : `/dashboard?section=${section}`);
  };

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

  const handleRemoveFriend = async (item: FriendItem) => {
    setPendingFriendshipId(item.friendship_id);
    try {
      await friendsService.removeFriendship(item.friendship_id);
      setFriends((prev) => prev.filter((entry) => entry.friendship_id !== item.friendship_id));
      success(`Amizade com @${item.user.username} removida.`);
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError ? err.message : 'Não foi possível remover a amizade.',
      );
    } finally {
      setPendingFriendshipId(null);
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    setPendingFriendshipId(req.friendship_id);
    try {
      const res = await friendsService.acceptRequest(req.friendship_id);
      setReceivedRequests((prev) =>
        prev.filter((entry) => entry.friendship_id !== req.friendship_id),
      );
      success(res.message || `Você e @${req.user.username} agora são amigos!`);
      void loadFriends();
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError ? err.message : 'Não foi possível aceitar o pedido.',
      );
    } finally {
      setPendingFriendshipId(null);
    }
  };

  const handleDeclineRequest = async (req: FriendRequest) => {
    setPendingFriendshipId(req.friendship_id);
    try {
      await friendsService.removeFriendship(req.friendship_id);
      setReceivedRequests((prev) =>
        prev.filter((entry) => entry.friendship_id !== req.friendship_id),
      );
      success(`Pedido de @${req.user.username} recusado.`);
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError ? err.message : 'Não foi possível recusar o pedido.',
      );
    } finally {
      setPendingFriendshipId(null);
    }
  };

  const handleCancelSentRequest = async (req: FriendRequest) => {
    setPendingFriendshipId(req.friendship_id);
    try {
      await friendsService.removeFriendship(req.friendship_id);
      setSentRequests((prev) => prev.filter((entry) => entry.friendship_id !== req.friendship_id));
      success(`Pedido enviado para @${req.user.username} cancelado.`);
    } catch (err: unknown) {
      showErrorToast(
        err instanceof ApiClientError ? err.message : 'Não foi possível cancelar o pedido.',
      );
    } finally {
      setPendingFriendshipId(null);
    }
  };

  if (!user) {
    return null;
  }

  const totalPendingRequests = receivedRequests.length + sentRequests.length;

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep text-text-primary md:flex-row">
      <LiquidSidebar
        activeSection="friends"
        onSelectSection={handleSelectSection}
        onOpenUpload={() => router.push('/dashboard?upload=1')}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        showInlineCollapseToggle
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={() => void handleLogout()}
      />

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Cabeçalho */}
          <header className="flex items-center gap-3.5 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep text-success">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                AMIGOS
              </h1>
              <p className="font-mono text-mono-meta text-text-secondary">
                Conecte-se com a galera da call, gerencie pedidos pendentes e libere clipes
                exclusivos para amigos.
              </p>
            </div>
          </header>

          {/* Card de Convite Pessoal */}
          <InviteLinkCard
            invite={myInvite}
            isLoading={isLoadingInvite}
            onRetry={() => void loadMyInvite()}
          />

          {/* Barra de 3 Abas */}
          <div
            role="tablist"
            aria-label="Seções de amizades"
            className="flex flex-wrap gap-2 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'friends'}
              onClick={() => setActiveTab('friends')}
              className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-mono text-mono-body transition-colors ${
                activeTab === 'friends'
                  ? 'border-success bg-bg-deep font-semibold text-text-primary'
                  : 'border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <Users
                className={`h-4 w-4 shrink-0 ${
                  activeTab === 'friends' ? 'text-success' : 'text-text-muted'
                }`}
                aria-hidden="true"
              />
              <span>Meus Amigos</span>
              <span className="rounded-control border border-border-muted bg-bg-surface px-1.5 py-0.5 font-mono text-mono-badge text-text-secondary">
                {friends.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
              className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-mono text-mono-body transition-colors ${
                activeTab === 'requests'
                  ? 'border-success bg-bg-deep font-semibold text-text-primary'
                  : 'border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <Clock
                className={`h-4 w-4 shrink-0 ${
                  activeTab === 'requests' ? 'text-success' : 'text-text-muted'
                }`}
                aria-hidden="true"
              />
              <span>Pedidos Pendentes</span>
              <span
                className={`rounded-control px-1.5 py-0.5 font-mono text-mono-badge ${
                  receivedRequests.length > 0
                    ? 'bg-danger font-bold text-text-primary'
                    : 'border border-border-muted bg-bg-surface text-text-secondary'
                }`}
              >
                {totalPendingRequests}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
              className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-mono text-mono-body transition-colors ${
                activeTab === 'search'
                  ? 'border-success bg-bg-deep font-semibold text-text-primary'
                  : 'border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <Search
                className={`h-4 w-4 shrink-0 ${
                  activeTab === 'search' ? 'text-success' : 'text-text-muted'
                }`}
                aria-hidden="true"
              />
              <span>Buscar Pessoas</span>
            </button>
          </div>

          {/* Conteúdo da Aba */}
          {activeTab === 'friends' && (
            <FriendsListTab
              friends={friends}
              isLoading={isLoadingFriends}
              pendingFriendshipId={pendingFriendshipId}
              onRemoveFriend={handleRemoveFriend}
              onSwitchToSearch={() => setActiveTab('search')}
            />
          )}

          {activeTab === 'requests' && (
            <FriendRequestsTab
              received={receivedRequests}
              sent={sentRequests}
              isLoading={isLoadingRequests}
              pendingFriendshipId={pendingFriendshipId}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
              onCancelSentRequest={handleCancelSentRequest}
            />
          )}

          {activeTab === 'search' && (
            <UserSearchTab
              onFriendshipMutated={() => {
                void loadFriends();
                void loadRequests();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
