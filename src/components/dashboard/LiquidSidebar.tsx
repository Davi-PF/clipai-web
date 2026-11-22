'use client';

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Flame,
  FolderKanban,
  LogOut,
  Sparkles,
} from 'lucide-react';
import type { User } from '@/types/api';

export type DashboardSection = 'home' | 'recent' | 'featured' | 'favorites' | 'collections';

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
] as const;

export interface LiquidSidebarProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: User;
  isLoggingOut: boolean;
  onLogout: () => void;
}

function getUserInitials(user: User): string {
  const source = user.display_name || user.username;
  return source.slice(0, 2).toUpperCase();
}

export function LiquidSidebar({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  user,
  isLoggingOut,
  onLogout,
}: Readonly<LiquidSidebarProps>) {
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
            <span className="hidden font-mono text-mono-meta text-text-secondary sm:inline">
              @{user.username}
            </span>
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
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
                <Film className="h-5 w-5 text-success" aria-hidden="true" />
              </span>
              {!isCollapsed && (
                <div className="flex items-center gap-2">
                  <span className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                    CLIPAÍ
                  </span>
                  <span className="rounded-control bg-warning px-1.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
                    BETA
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
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

          {isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expandir sidebar"
              title="Expandir sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

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
          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'mb-3'}`}>
            <div className="relative flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border border-border-muted bg-bg-deep font-mono text-xs font-bold uppercase leading-none tracking-normal text-text-primary">
              <span className="inline-flex items-center justify-center leading-none">
                {getUserInitials(user)}
              </span>
              <span
                title="Online"
                aria-label="Status online"
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-surface bg-success"
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-mono-body font-semibold text-text-primary">
                  {user.display_name}
                </p>
                <p className="truncate font-mono text-mono-badge text-text-muted">
                  @{user.username}
                </p>
              </div>
            )}
          </div>

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
