'use client';

import {
  BarChart3,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Flame,
  FolderKanban,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { User } from '@/types/api';
import { getUserDisplayName } from '@/types/user';

export type DashboardSection =
  | 'home'
  | 'recent'
  | 'featured'
  | 'favorites'
  | 'collections'
  | 'studio'
  | 'settings';

interface NavItemConfig {
  id: DashboardSection;
  label: string;
  Icon: typeof Compass;
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  { id: 'home', label: 'Início', Icon: Compass },
  { id: 'recent', label: 'Novos Clipes', Icon: Sparkles },
  { id: 'featured', label: 'Destaques', Icon: Flame },
  { id: 'favorites', label: 'Favoritos', Icon: Bookmark },
  { id: 'collections', label: 'Coleções', Icon: FolderKanban },
  { id: 'studio', label: 'Estúdio', Icon: BarChart3 },
  { id: 'settings', label: 'Ajustes', Icon: Settings },
] as const;

export interface LiquidSidebarProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  showInlineCollapseToggle?: boolean;
  user: User;
  isLoggingOut: boolean;
  onLogout: () => void;
}

export function LiquidSidebar({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  showInlineCollapseToggle = false,
  user,
  isLoggingOut,
  onLogout,
}: Readonly<LiquidSidebarProps>) {
  const displayName = getUserDisplayName(user);

  return (
    <>
      {/* Navegação compacta Mobile/Tablet (< lg) */}
      <header className="flex flex-col gap-3 border-b border-border-muted bg-bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <Film className="h-4 w-4 text-success" aria-hidden="true" />
            </span>
            <span className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
              CLIPAÍ
            </span>
            <span className="rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
              BETA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectSection('settings')}
              aria-label="Abrir configurações do perfil"
              className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-2.5 py-1 text-left transition-colors hover:border-success"
            >
              <UserAvatar
                username={user.username}
                displayName={user.display_name}
                avatarUrl={user.avatar_url}
                size="xs"
              />
              <span className="hidden font-mono text-mono-meta text-text-primary sm:inline">
                @{user.username}
              </span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              aria-label="Sair da conta"
              className="inline-flex items-center gap-1.5 rounded-control border border-border-muted bg-bg-elevated px-3 py-1.5 font-mono text-mono-badge text-danger-text transition-colors hover:border-danger hover:bg-danger-surface"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>

        <nav aria-label="Navegação principal mobile" className="flex gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectSection(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-control border px-3 py-1.5 font-mono text-mono-meta transition-colors ${
                  isActive
                    ? 'border-success bg-bg-deep text-text-primary'
                    : 'border-border-muted bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${isActive ? 'text-success' : 'text-text-muted'}`}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Sidebar Líquida Colapsável Desktop (lg+) */}
      <aside
        aria-label="Sidebar Líquida de navegação"
        data-collapsed={isCollapsed ? 'true' : 'false'}
        className={`relative z-20 hidden shrink-0 flex-col justify-between border-r border-border-muted bg-bg-surface py-6 shadow-[10px_0_28px_-2px_rgba(2,10,18,0.8),3px_0_10px_rgba(2,10,18,0.55)] transition-[width] duration-300 ease-out lg:flex ${
          isCollapsed ? 'w-[76px] items-center px-2' : 'w-[232px] pl-4 pr-0'
        }`}
      >
        <div className={`w-full space-y-8 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Logo CLIPAÍ */}
          <div
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between pr-4'}`}
          >
            {isCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expandir sidebar"
                title="Expandir sidebar"
                className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep transition-colors hover:border-success hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
              >
                <Film
                  className="h-5 w-5 text-success transition-opacity duration-150 group-hover:opacity-0"
                  aria-hidden="true"
                />
                <ChevronRight
                  className="absolute h-5 w-5 text-success opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
                  <Film className="h-5 w-5 text-success" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                    CLIPAÍ
                  </span>
                  <span className="rounded-control bg-warning px-1.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
                    BETA
                  </span>
                </div>
              </div>
            )}

            {!isCollapsed && showInlineCollapseToggle && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Recolher sidebar"
                title="Recolher sidebar"
                className="rounded-control p-1 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Lista de Itens Líquidos */}
          <nav
            aria-label="Navegação do dashboard"
            className={`w-full ${isCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-1.5'}`}
          >
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const isActive = activeSection === id;

              if (isCollapsed) {
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    title={label}
                    onClick={() => onSelectSection(id)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? 'bg-bg-deep text-text-primary ring-[1.5px] ring-success'
                        : 'bg-bg-elevated/60 text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? 'text-success' : 'text-text-secondary'}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              }

              return (
                <button
                  key={id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelectSection(id)}
                  className={`relative flex h-11 items-center gap-3 pl-4 pr-4 text-left font-mono text-mono-body leading-5 transition-colors ${
                    isActive
                      ? 'liquid-nav-active z-30 rounded-l-[14px] bg-bg-deep font-semibold text-text-primary'
                      : 'mr-4 w-[calc(100%-1rem)] rounded-card border border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1.5 top-1/2 h-[22px] w-[3.5px] -translate-y-1/2 rounded-full bg-success"
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-success' : 'text-text-muted'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé do Usuário */}
        <div
          className={`w-full border-t border-border-muted pt-4 ${
            isCollapsed ? 'flex flex-col items-center gap-3' : 'pr-4'
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectSection('settings')}
            aria-label="Abrir configurações do usuário"
            title="Configurações do perfil"
            className={`group flex items-center gap-2.5 rounded-card transition-colors hover:bg-bg-elevated/70 ${
              isCollapsed ? 'justify-center p-1' : 'mb-3 w-full p-1.5 text-left'
            }`}
          >
            <UserAvatar
              username={user.username}
              displayName={user.display_name}
              avatarUrl={user.avatar_url}
              size="md"
              showOnlineStatus
            />

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-mono-body font-semibold text-text-primary group-hover:text-success">
                  {displayName}
                </p>
                <p className="truncate font-mono text-mono-badge text-text-muted">
                  @{user.username}
                </p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            aria-label="SAIR"
            title="Sair da conta"
            className={`inline-flex items-center justify-center gap-2 rounded-control border border-border-muted bg-bg-elevated font-mono text-mono-meta text-text-secondary transition-colors hover:border-danger hover:bg-danger-surface hover:text-text-primary disabled:opacity-50 ${
              isCollapsed ? 'h-10 w-10 rounded-full p-0' : 'h-10 w-full px-3'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!isCollapsed && <span>{isLoggingOut ? 'Saindo...' : 'SAIR'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
