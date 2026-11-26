'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Edit3, FolderKanban, Trash2, X } from 'lucide-react';
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';
import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog';
import { ClipQueueList } from '@/components/dashboard/ClipQueueList';
import { CollectionsFanWidget } from '@/components/dashboard/CollectionsFanWidget';
import { HeroPlayerBento } from '@/components/dashboard/HeroPlayerBento';
import { LiquidSidebar, type DashboardSection } from '@/components/dashboard/LiquidSidebar';
import {
  QuickFiltersCard,
  type QuickFilterSelection,
} from '@/components/dashboard/QuickFiltersCard';
import { UploadClipModal } from '@/components/upload/UploadClipModal';
import { Button } from '@/components/ui/Button';
import { type DashboardContentSection, useSidebarState } from '@/contexts/sidebar-context';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { useClipSocial, type SocialMutationPatch } from '@/hooks/useClipSocial';
import { ApiClientError } from '@/lib/api-client';
import { authService } from '@/services/auth-service';
import { clipsService } from '@/services/clips-service';
import { collectionsService } from '@/services/collections-service';
import {
  getClipShareSlug,
  type Clip,
  type ClipPeriod,
  type ClipSortOption,
  type ClipSummary,
  type Game,
  type Tag,
} from '@/types/clip';
import type { Collection } from '@/types/collection';

const QUEUE_PAGE_SIZE = 4;
const SEARCH_DEBOUNCE_MS = 300;
const DASHBOARD_SECTIONS: readonly DashboardContentSection[] = [
  'home',
  'recent',
  'featured',
  'most_viewed',
  'favorites',
  'collections',
] as const;

const MOBILE_FEED_PILLS: readonly { id: DashboardContentSection; label: string }[] = [
  { id: 'recent', label: 'Novos' },
  { id: 'featured', label: 'Destaques' },
  { id: 'most_viewed', label: 'Mais Vistos' },
] as const;

interface SectionPresentation {
  sort: ClipSortOption;
  showPeriodFilter: boolean;
  queueTitle: string;
  queueEmpty?: string;
  heroEmptyTitle?: string;
  heroEmptyDescription?: string;
}

const SECTION_PRESENTATIONS: Partial<Record<DashboardContentSection, SectionPresentation>> = {
  featured: {
    sort: 'featured',
    showPeriodFilter: true,
    queueTitle: 'TOP DESTAQUES',
    queueEmpty: 'Nenhum clipe com curtidas ou favoritos em destaque neste período.',
    heroEmptyTitle: 'NENHUM DESTAQUE AINDA',
    heroEmptyDescription:
      'Ainda não há clipes com curtidas ou favoritos para o período selecionado. Ajuste o filtro de tempo ou envie uma jogada.',
  },
  most_viewed: {
    sort: 'most_viewed',
    showPeriodFilter: true,
    queueTitle: 'MAIS VISTOS',
    queueEmpty: 'Nenhum clipe com visualizações registradas neste período.',
    heroEmptyTitle: 'NENHUM CLIPE VISTO AINDA',
    heroEmptyDescription:
      'Ainda não há clipes com visualizações registradas no período selecionado.',
  },
};

function getSectionPresentation(section: DashboardContentSection): SectionPresentation {
  return (
    SECTION_PRESENTATIONS[section] ?? {
      sort: 'recent',
      showPeriodFilter: false,
      queueTitle: 'NA FILA / RECENTES',
    }
  );
}

function resolveDashboardSectionFromUrl(): DashboardContentSection | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const param = new URLSearchParams(window.location.search).get('section');
  if (param && (DASHBOARD_SECTIONS as readonly string[]).includes(param)) {
    return param as DashboardContentSection;
  }
  return null;
}

export function BentoDashboardWorkspace() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const quickFiltersRef = useRef<HTMLDivElement | null>(null);
  const viewedClipIdsRef = useRef<Set<string>>(new Set());

  const {
    isCollapsed: isSidebarCollapsed,
    toggleCollapsed: toggleSidebarCollapsed,
    activeSection,
    setActiveSection,
  } = useSidebarState();
  const [quickFilter, setQuickFilter] = useState<QuickFilterSelection>({});
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [period, setPeriod] = useState<ClipPeriod>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [games, setGames] = useState<Game[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [activeClip, setActiveClip] = useState<ClipSummary | null>(null);
  const [isLoadingClips, setIsLoadingClips] = useState(true);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isDeleteCollectionOpen, setIsDeleteCollectionOpen] = useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [saveCollectionClip, setSaveCollectionClip] = useState<ClipSummary | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  // Sincroniza seção e modal de upload via URL (ex.: F5 ou atalho mobile vindo de /settings)
  useEffect(() => {
    const urlSection = resolveDashboardSectionFromUrl();
    if (urlSection) {
      setActiveSection(urlSection);
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('upload') === '1') {
        setIsUploadOpen(true);
        params.delete('upload');
        const query = params.toString();
        window.history.replaceState(null, '', query ? `/dashboard?${query}` : '/dashboard');
      }
    }
  }, [setActiveSection]);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Carrega jogos e tags populares para os Filtros Rápidos 3x3
  useEffect(() => {
    let isActive = true;

    async function loadCatalog() {
      const [gamesRes, tagsRes] = await Promise.all([
        clipsService.listGames({ page_size: 20 }).catch(() => null),
        clipsService.listTags({ limit: 12 }).catch(() => null),
      ]);
      if (!isActive) return;
      if (gamesRes) setGames(gamesRes.items);
      if (tagsRes) setTags(tagsRes.items);
    }

    void loadCatalog();
    return () => {
      isActive = false;
    };
  }, []);

  // Carrega coleções do usuário
  const loadCollections = useCallback(async () => {
    setIsLoadingCollections(true);
    try {
      const response = await collectionsService.listCollections({ mine: true, page_size: 12 });
      setCollections(response.items);
    } catch {
      setCollections([]);
    } finally {
      setIsLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (activeSection === 'collections' && !activeCollection && collections.length > 0) {
      setActiveCollection(collections[0] ?? null);
    }
  }, [activeSection, activeCollection, collections]);

  // Carrega clipes filtrados
  const loadClips = useCallback(async () => {
    setIsLoadingClips(true);
    try {
      const presentation = getSectionPresentation(activeSection);
      const response = await clipsService.listClips({
        q: debouncedQuery || undefined,
        game_slug: quickFilter.gameSlug,
        tag: quickFilter.tagSlug,
        favorited: activeSection === 'favorites' ? true : undefined,
        collection_id: activeCollection?.id,
        sort: presentation.sort,
        period: presentation.showPeriodFilter ? period : undefined,
        page,
        page_size: QUEUE_PAGE_SIZE,
      });

      setClips(response.items);
      setTotalPages(Math.max(1, response.total_pages));
      setActiveClip((prev) => {
        if (prev && response.items.some((item) => item.id === prev.id)) {
          return response.items.find((item) => item.id === prev.id) ?? response.items[0] ?? null;
        }
        return response.items[0] ?? null;
      });
    } catch {
      setClips([]);
      setActiveClip(null);
      setTotalPages(1);
    } finally {
      setIsLoadingClips(false);
    }
  }, [debouncedQuery, quickFilter, activeSection, activeCollection, period, page]);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  const patchClipInState = useCallback((clipId: string, patch: SocialMutationPatch) => {
    setClips((prev) => prev.map((item) => (item.id === clipId ? { ...item, ...patch } : item)));
    setActiveClip((prev) => (prev?.id === clipId ? { ...prev, ...patch } : prev));
  }, []);

  const { toggleLike, toggleFavorite, isLikePending, isFavoritePending } =
    useClipSocial(patchClipInState);

  const handlePlayStart = useCallback((clip: ClipSummary) => {
    if (viewedClipIdsRef.current.has(clip.id)) {
      return;
    }
    viewedClipIdsRef.current.add(clip.id);
    void clipsService
      .registerView(clip.id)
      .then((res) => {
        setClips((prev) =>
          prev.map((item) =>
            item.id === clip.id ? { ...item, views_count: res.views_count } : item,
          ),
        );
        setActiveClip((prev) =>
          prev?.id === clip.id ? { ...prev, views_count: res.views_count } : prev,
        );
      })
      .catch(() => {
        viewedClipIdsRef.current.delete(clip.id);
      });
  }, []);

  const handleCopyLink = useCallback(
    async (clip: ClipSummary) => {
      const shareUrl = `${window.location.origin}/c/${getClipShareSlug(clip)}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        success('Link copiado para a área de transferência!');
      } catch {
        showErrorToast('Não foi possível copiar o link automaticamente.');
      }
    },
    [success, showErrorToast],
  );

  const handleSelectSection = (section: DashboardSection) => {
    if (section === 'settings') {
      router.push('/settings');
      return;
    }
    if (section === 'studio') {
      router.push('/studio');
      return;
    }
    setActiveSection(section);
    setPage(1);
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('section')
    ) {
      const nextUrl = section === 'home' ? '/dashboard' : `/dashboard?section=${section}`;
      window.history.replaceState(null, '', nextUrl);
    }
    if (section !== 'collections') {
      setActiveCollection(null);
    } else if (!activeCollection && collections.length > 0) {
      setActiveCollection(collections[0] ?? null);
    }
  };

  const handleSelectCollection = (collection: Collection) => {
    setActiveCollection(collection);
    setActiveSection('collections');
    setPage(1);
  };

  const handleDeleteActiveCollection = async () => {
    if (!activeCollection) return;
    setIsDeletingCollection(true);
    try {
      await collectionsService.deleteCollection(activeCollection.id);
      success(`Coleção "${activeCollection.title}" excluída.`);
      setCollections((prev) => prev.filter((item) => item.id !== activeCollection.id));
      setIsDeleteCollectionOpen(false);
      setActiveCollection(null);
      setActiveSection('home');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError ? err.message : 'Não foi possível excluir a coleção.';
      showErrorToast(message);
    } finally {
      setIsDeletingCollection(false);
    }
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

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setIsResendingVerification(true);
    try {
      const res = await authService.resendVerification(user.email);
      success(res.message);
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

  const handleUploadSuccess = (newClip: Clip) => {
    if (activeSection === 'featured' || activeSection === 'most_viewed') {
      return;
    }
    setClips((prev) => [newClip, ...prev.filter((item) => item.id !== newClip.id)]);
    setActiveClip(newClip);
  };

  if (!user) {
    return null;
  }

  const isCollectionOwner = activeCollection?.owner.id === user.id;
  const presentation = getSectionPresentation(activeSection);

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep text-text-primary md:flex-row">
      <LiquidSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenUpload={() => setIsUploadOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={() => void handleLogout()}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 md:px-7 md:py-6">
        <div className="mx-auto w-full max-w-[1440px] space-y-4">
          {!user.is_email_verified && (
            <div
              data-testid="email-pending-banner"
              className="flex flex-col justify-between gap-3 rounded-card border border-warning bg-bg-surface px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5 font-mono text-mono-meta text-text-primary sm:items-center">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning sm:mt-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  Confirme seu e-mail (<strong className="break-all">{user.email}</strong>) para
                  liberar uploads e interações sociais.
                </span>
              </div>
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

          {activeCollection && (
            <div
              data-testid="active-collection-banner"
              className="flex min-w-0 flex-col gap-3 rounded-card border border-success bg-bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FolderKanban className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="shrink-0 font-mono text-mono-meta text-text-secondary">
                    Coleção ativa:
                  </span>
                  <span className="shrink-0 rounded-control bg-bg-deep px-2 py-0.5 font-mono text-mono-badge text-success">
                    {activeCollection.clips_count}{' '}
                    {activeCollection.clips_count === 1 ? 'clipe' : 'clipes'}
                  </span>
                </div>

                <h2
                  data-testid="active-collection-title"
                  className="min-w-0 break-words font-display text-display-md uppercase text-text-primary"
                >
                  {activeCollection.title}
                </h2>

                {activeCollection.description && (
                  <p className="min-w-0 break-words font-mono text-mono-badge text-text-secondary">
                    {activeCollection.description}
                  </p>
                )}
              </div>

              <div
                data-testid="active-collection-actions"
                className="flex shrink-0 flex-wrap items-center gap-2"
              >
                {isCollectionOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCollection(activeCollection);
                        setIsCreateCollectionOpen(true);
                      }}
                      aria-label="Editar coleção ativa"
                      className="inline-flex shrink-0 items-center gap-1 rounded-control border border-border-muted bg-bg-elevated px-2.5 py-1.5 font-mono text-mono-badge text-text-primary hover:border-success"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleteCollectionOpen(true)}
                      aria-label="Excluir coleção ativa"
                      className="inline-flex shrink-0 items-center gap-1 rounded-control border border-danger bg-danger-surface px-2.5 py-1.5 font-mono text-mono-badge text-danger-text hover:bg-danger hover:text-text-primary"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Excluir
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCollection(null);
                    setActiveSection('home');
                    setPage(1);
                  }}
                  aria-label="Remover filtro de coleção"
                  className="inline-flex shrink-0 items-center gap-1 rounded-control border border-border-muted bg-bg-deep px-2.5 py-1.5 font-mono text-mono-badge text-text-secondary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* Pílulas rápidas mobile (< 768px) para alternar entre Novos, Destaques e Mais Vistos */}
          <div
            role="group"
            aria-label="Navegação rápida do feed"
            data-testid="mobile-feed-pills"
            className="flex flex-wrap items-center gap-2 md:hidden"
          >
            {MOBILE_FEED_PILLS.map((pill) => {
              const isSelected = activeSection === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectSection(pill.id)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-mono-badge transition-colors ${
                    isSelected
                      ? 'border-success bg-bg-surface font-semibold text-success'
                      : 'border-border-muted bg-bg-surface text-text-secondary hover:border-text-secondary hover:text-text-primary'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Grid Principal Bento: 2 colunas completas em Desktop (>= 1280px); 2x1 inferior em Tablet/Compacto */}
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
            {/* Coluna Central: Hero Player em formato "L" + Filtros Rápidos 3x3 encaixados */}
            <HeroPlayerBento
              clip={activeClip}
              isLoading={isLoadingClips}
              isFeaturedHighlight={Boolean(activeClip?.is_top_highlight)}
              emptyStateTitle={presentation.heroEmptyTitle}
              emptyStateDescription={presentation.heroEmptyDescription}
              isSidebarCollapsed={isSidebarCollapsed}
              isLikePending={activeClip ? isLikePending(activeClip.id) : false}
              isFavoritePending={activeClip ? isFavoritePending(activeClip.id) : false}
              onToggleSidebar={toggleSidebarCollapsed}
              onPlayStart={handlePlayStart}
              onToggleLike={(clip) => void toggleLike(clip)}
              onToggleFavorite={(clip) => void toggleFavorite(clip)}
              onOpenSaveCollection={(clip) => setSaveCollectionClip(clip)}
              onCopyLink={(clip) => void handleCopyLink(clip)}
              onOpenUpload={() => setIsUploadOpen(true)}
              cutoutRef={quickFiltersRef}
              quickFiltersSlot={
                <QuickFiltersCard
                  cardRef={quickFiltersRef}
                  games={games}
                  tags={tags}
                  activeFilter={quickFilter}
                  onSelectFilter={(next) => {
                    setQuickFilter(next);
                    setPage(1);
                  }}
                  onClearFilters={() => {
                    setQuickFilter({});
                    setPage(1);
                  }}
                />
              }
            />

            {/* Coluna Direita: Busca + NA FILA / RECENTES + COLEÇÕES em leque (alinhada à altura do Hero em xl+) */}
            <div className="w-full min-w-0 xl:relative xl:min-h-[590px]">
              <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:items-start xl:absolute xl:inset-0 xl:flex xl:flex-col xl:items-stretch">
                <ClipQueueList
                  clips={clips}
                  activeClipId={activeClip?.id ?? null}
                  sectionTitle={presentation.queueTitle}
                  emptyMessage={presentation.queueEmpty}
                  showPeriodFilter={presentation.showPeriodFilter}
                  period={period}
                  onPeriodChange={(nextPeriod) => {
                    setPeriod(nextPeriod);
                    setPage(1);
                  }}
                  isLoading={isLoadingClips}
                  searchValue={searchInput}
                  page={page}
                  totalPages={totalPages}
                  onSearchChange={setSearchInput}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onSelectClip={(selected) => setActiveClip(selected)}
                  onPageChange={setPage}
                />

                <CollectionsFanWidget
                  collections={collections}
                  activeCollectionId={activeCollection?.id ?? null}
                  isLoading={isLoadingCollections}
                  onOpenCreate={() => {
                    setEditingCollection(null);
                    setIsCreateCollectionOpen(true);
                  }}
                  onSelectCollection={handleSelectCollection}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <UploadClipModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <CreateCollectionModal
        isOpen={isCreateCollectionOpen}
        initialCollection={editingCollection}
        onClose={() => {
          setIsCreateCollectionOpen(false);
          setEditingCollection(null);
        }}
        onSaved={(saved) => {
          setCollections((prev) => {
            const exists = prev.some((item) => item.id === saved.id);
            if (exists) {
              return prev.map((item) => (item.id === saved.id ? saved : item));
            }
            return [saved, ...prev];
          });
          if (activeCollection?.id === saved.id) {
            setActiveCollection(saved);
          }
        }}
      />

      {saveCollectionClip && (
        <AddToCollectionModal
          clipId={saveCollectionClip.id}
          clipTitle={saveCollectionClip.title}
          isOpen
          onClose={() => setSaveCollectionClip(null)}
          onMembershipChanged={() => void loadCollections()}
        />
      )}

      <DeleteCollectionDialog
        isOpen={Boolean(activeCollection && isDeleteCollectionOpen)}
        collectionTitle={activeCollection?.title ?? ''}
        isDeleting={isDeletingCollection}
        onCancel={() => setIsDeleteCollectionOpen(false)}
        onConfirm={() => void handleDeleteActiveCollection()}
      />
    </div>
  );
}
