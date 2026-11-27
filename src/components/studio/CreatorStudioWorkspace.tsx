'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Plus } from 'lucide-react';
import { LiquidSidebar, type DashboardSection } from '@/components/dashboard/LiquidSidebar';
import { DeleteClipDialog } from '@/components/player/DeleteClipDialog';
import { EditClipModal } from '@/components/player/EditClipModal';
import { StudioChartsGrid } from '@/components/studio/StudioChartsGrid';
import { StudioClipsTable } from '@/components/studio/StudioClipsTable';
import { StudioKpiGrid } from '@/components/studio/StudioKpiGrid';
import { Button } from '@/components/ui/Button';
import { UploadClipModal } from '@/components/upload/UploadClipModal';
import { useSidebarState } from '@/contexts/sidebar-context';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { analyticsService } from '@/services/analytics-service';
import { clipsService } from '@/services/clips-service';
import type {
  AnalyticsClipSort,
  AnalyticsOverviewResponse,
  AnalyticsPeriod,
  ClipRetentionResponse,
  CreatorClipAnalyticsItem,
} from '@/types/analytics';
import type { PrivacyLevel } from '@/types/api';
import type { Clip } from '@/types/clip';

const PERIOD_OPTIONS: readonly { id: AnalyticsPeriod; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'all', label: 'TUDO' },
] as const;

export const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 300;

interface StudioClipsPageResult {
  items: CreatorClipAnalyticsItem[];
  totalPages: number;
  safePage: number;
}

export function resolveStudioClipsPage(params: {
  rawItems: readonly CreatorClipAnalyticsItem[];
  apiTotalPages: number;
  page: number;
  pageSize?: number;
}): StudioClipsPageResult {
  const pageSize = Math.max(1, params.pageSize ?? ITEMS_PER_PAGE);

  if (params.rawItems.length > pageSize) {
    const totalPages = Math.max(1, Math.ceil(params.rawItems.length / pageSize));
    const safePage = Math.min(Math.max(1, params.page), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return {
      items: params.rawItems.slice(startIndex, startIndex + pageSize),
      totalPages,
      safePage,
    };
  }

  const totalPages = Math.max(1, params.apiTotalPages);
  const safePage = Math.min(Math.max(1, params.page), totalPages);
  return {
    items: [...params.rawItems],
    totalPages,
    safePage,
  };
}

export function CreatorStudioWorkspace() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success, error: showErrorToast } = useToast();
  const {
    isCollapsed: isSidebarCollapsed,
    toggleCollapsed: toggleSidebarCollapsed,
    setActiveSection,
  } = useSidebarState();

  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<AnalyticsClipSort>('views');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  const [clips, setClips] = useState<CreatorClipAnalyticsItem[]>([]);
  const [isLoadingClips, setIsLoadingClips] = useState(true);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [retention, setRetention] = useState<ClipRetentionResponse | null>(null);
  const [isLoadingRetention, setIsLoadingRetention] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [deletingClip, setDeletingClip] = useState<CreatorClipAnalyticsItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedQuery) {
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedQuery]);

  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const data = await analyticsService.getOverview(period);
      setOverview(data);
      const topClipId = data.top_clips[0]?.id ?? null;
      setSelectedClipId((prev) => prev ?? topClipId);
    } catch {
      setOverview(null);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [period]);

  const loadCreatorClips = useCallback(async () => {
    setIsLoadingClips(true);
    try {
      const res = await analyticsService.listCreatorClips({
        q: debouncedQuery || undefined,
        privacy: privacyFilter === 'all' ? undefined : privacyFilter,
        period,
        sort: sortBy,
        page,
        page_size: ITEMS_PER_PAGE,
      });
      const resolved = resolveStudioClipsPage({
        rawItems: res.items,
        apiTotalPages: res.total_pages,
        page,
        pageSize: ITEMS_PER_PAGE,
      });
      setClips(resolved.items);
      setTotalPages(resolved.totalPages);
      if (resolved.safePage !== page) {
        setPage(resolved.safePage);
      }
      const firstClipId = resolved.items[0]?.id ?? null;
      setSelectedClipId((prev) => prev ?? firstClipId);
    } catch {
      setClips([]);
      setTotalPages(1);
    } finally {
      setIsLoadingClips(false);
    }
  }, [debouncedQuery, privacyFilter, period, sortBy, page]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadCreatorClips();
  }, [loadCreatorClips]);

  useEffect(() => {
    if (!selectedClipId) {
      setRetention(null);
      return;
    }

    let isActive = true;
    setIsLoadingRetention(true);

    void analyticsService
      .getClipRetention(selectedClipId, period)
      .then((res) => {
        if (isActive) {
          setRetention(res);
        }
      })
      .catch(() => {
        if (isActive) {
          setRetention(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingRetention(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedClipId, period]);

  const handleSelectSection = (section: DashboardSection) => {
    if (section === 'studio') {
      return;
    }
    if (section === 'friends') {
      router.push('/friends');
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

  const handleCopyLink = async (clip: CreatorClipAnalyticsItem) => {
    const shareUrl = `${window.location.origin}/c/${clip.slug || clip.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      success('Link copiado para a área de transferência!');
    } catch {
      showErrorToast('Não foi possível copiar o link automaticamente.');
    }
  };

  const handleOpenEdit = async (clip: CreatorClipAnalyticsItem) => {
    try {
      const fullClip = await clipsService.getClipBySlug(clip.slug || clip.id);
      setEditingClip(fullClip);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível carregar os detalhes do clipe para edição.';
      showErrorToast(message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClip) {
      return;
    }
    setIsDeleting(true);
    try {
      await clipsService.deleteClip(deletingClip.id);
      success(`Clipe "${deletingClip.title}" excluído com sucesso.`);
      if (selectedClipId === deletingClip.id) {
        setSelectedClipId(null);
      }
      setDeletingClip(null);
      await Promise.all([loadOverview(), loadCreatorClips()]);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError ? err.message : 'Não foi possível excluir o clipe.';
      showErrorToast(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div
      data-testid="studio-layout-shell"
      className="flex min-h-dvh flex-col bg-bg-deep text-text-primary md:h-dvh md:flex-row md:overflow-hidden"
    >
      <LiquidSidebar
        activeSection="studio"
        onSelectSection={handleSelectSection}
        onOpenUpload={() => setIsUploadOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        showInlineCollapseToggle
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={() => void handleLogout()}
      />

      <main
        data-testid="studio-main-content"
        className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-6"
      >
        <div className="mx-auto max-w-[1440px] space-y-5">
          {/* Cabeçalho do Estúdio */}
          <header className="flex flex-col justify-between gap-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 md:flex-row md:items-center">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
                <BarChart3 className="h-5 w-5 text-success" aria-hidden="true" />
              </span>
              <div>
                <h1 className="font-display text-display-hero uppercase text-text-primary">
                  ESTÚDIO DO CRIADOR
                </h1>
                <p className="font-mono text-mono-meta text-text-secondary">
                  Acompanhe visualizações, retenção trecho a trecho e desempenho dos seus clipes.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Seletor de período em pills */}
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="sr-only">Selecionar período de análise</legend>
                <div className="inline-flex items-center gap-1 rounded-control border border-border-muted bg-bg-deep p-1">
                  {PERIOD_OPTIONS.map((option) => {
                    const isActive = period === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          setPeriod(option.id);
                          setPage(1);
                        }}
                        className={`rounded-control px-3 py-1.5 font-mono text-mono-badge font-semibold transition-colors ${
                          isActive
                            ? 'bg-success text-bg-deep'
                            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <Button
                type="button"
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsUploadOpen(true)}
              >
                ENVIAR CLIPE
              </Button>
            </div>
          </header>

          {/* Cards de KPI */}
          <StudioKpiGrid overview={overview} isLoading={isLoadingOverview} />

          {/* Gráficos de Evolução e Curva de Retenção */}
          <StudioChartsGrid
            viewsByDay={overview?.views_by_day ?? []}
            isLoadingOverview={isLoadingOverview}
            retention={retention}
            isLoadingRetention={isLoadingRetention}
          />

          {/* Tabela Meus Clipes & Desempenho */}
          <StudioClipsTable
            clips={clips}
            selectedClipId={selectedClipId}
            isLoading={isLoadingClips}
            searchValue={searchInput}
            privacyFilter={privacyFilter}
            sortBy={sortBy}
            page={page}
            totalPages={totalPages}
            onSearchChange={setSearchInput}
            onPrivacyChange={(nextPrivacy) => {
              setPrivacyFilter(nextPrivacy);
              setPage(1);
            }}
            onSortChange={(nextSort) => {
              setSortBy(nextSort);
              setPage(1);
            }}
            onPageChange={setPage}
            onSelectClip={(clip) => setSelectedClipId(clip.id)}
            onCopyLink={(clip) => void handleCopyLink(clip)}
            onEditClip={(clip) => void handleOpenEdit(clip)}
            onDeleteClip={(clip) => setDeletingClip(clip)}
            onOpenUpload={() => setIsUploadOpen(true)}
            onClearFilters={() => {
              setSearchInput('');
              setDebouncedQuery('');
              setPrivacyFilter('all');
              setPage(1);
            }}
          />
        </div>
      </main>

      <UploadClipModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(newClip) => {
          setSelectedClipId(newClip.id);
          void loadOverview();
          void loadCreatorClips();
        }}
      />

      {editingClip && (
        <EditClipModal
          clip={editingClip}
          isOpen
          onClose={() => setEditingClip(null)}
          onUpdated={() => {
            setEditingClip(null);
            void loadOverview();
            void loadCreatorClips();
          }}
        />
      )}

      <DeleteClipDialog
        isOpen={Boolean(deletingClip)}
        clipTitle={deletingClip?.title ?? ''}
        isDeleting={isDeleting}
        onCancel={() => setDeletingClip(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
