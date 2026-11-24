'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  Compass,
  FolderKanban,
  Home,
  Plus,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import type { DashboardSection } from '@/components/dashboard/LiquidSidebar';

export interface MobileFloatingDockProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  onOpenUpload?: () => void;
}

interface DockItemConfig {
  id: 'home' | 'explore' | 'collections' | 'profile';
  label: string;
  section: DashboardSection;
  Icon: typeof Home;
  isActive: (activeSection: DashboardSection) => boolean;
}

const LEFT_DOCK_ITEMS: readonly DockItemConfig[] = [
  {
    id: 'home',
    label: 'Início',
    section: 'home',
    Icon: Home,
    isActive: (section) => section === 'home',
  },
  {
    id: 'explore',
    label: 'Explorar',
    section: 'featured',
    Icon: Compass,
    isActive: (section) => section === 'featured' || section === 'recent',
  },
] as const;

const RIGHT_DOCK_ITEMS: readonly DockItemConfig[] = [
  {
    id: 'collections',
    label: 'Coleções',
    section: 'collections',
    Icon: FolderKanban,
    isActive: (section) => section === 'collections',
  },
  {
    id: 'profile',
    label: 'Perfil',
    section: 'settings',
    Icon: UserIcon,
    isActive: (section) => section === 'settings',
  },
] as const;

function DockNavButton({
  item,
  activeSection,
  onSelect,
}: Readonly<{
  item: DockItemConfig;
  activeSection: DashboardSection;
  onSelect: (section: DashboardSection) => void;
}>) {
  const active = item.isActive(activeSection);
  const Icon = item.Icon;

  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(item.section)}
      className={`relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-control px-1 font-mono text-[10px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${
        active ? 'font-semibold text-text-primary' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          data-testid={`mobile-dock-active-indicator-${item.id}`}
          className="absolute top-[2px] h-[3px] w-7 rounded-full bg-success shadow-[0_0_10px_rgba(46,184,134,0.85)]"
        />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
          active ? 'text-success' : 'text-text-secondary'
        }`}
        aria-hidden="true"
      />
      <span className="whitespace-nowrap">{item.label}</span>
    </button>
  );
}

export function MobileFloatingDock({
  activeSection,
  onSelectSection,
  onOpenUpload,
}: Readonly<MobileFloatingDockProps>) {
  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  const closeRadialMenu = useCallback(() => {
    setIsRadialOpen(false);
    fabRef.current?.blur();
  }, []);

  const handleToggleRadial = () => {
    if (isRadialOpen) {
      closeRadialMenu();
      return;
    }
    setIsRadialOpen(true);
  };

  useEffect(() => {
    if (!isRadialOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRadialMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRadialOpen, closeRadialMenu]);

  const handleDockSelect = (section: DashboardSection) => {
    closeRadialMenu();
    onSelectSection(section);
  };

  const handleUploadAction = () => {
    closeRadialMenu();
    if (onOpenUpload) {
      onOpenUpload();
      return;
    }
    onSelectSection('home');
  };

  return (
    <>
      {isRadialOpen && (
        <button
          type="button"
          data-testid="mobile-dock-backdrop"
          aria-label="Fechar menu rápido"
          onClick={closeRadialMenu}
          className="fixed inset-0 z-30 bg-bg-deep/75 backdrop-blur-[2px] md:hidden"
        />
      )}

      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md md:hidden">
        {/* Menu radial / leque flutuante de 3 ações acima do recorte central */}
        {isRadialOpen && (
          <div
            id="mobile-radial-menu"
            role="menu"
            aria-label="Menu rápido mobile"
            data-testid="mobile-radial-menu"
            className="pointer-events-none absolute bottom-16 left-1/2 z-50 h-0 w-0"
          >
            {/* Esquerda superior: Favoritos */}
            <div className="radial-dock-item pointer-events-auto absolute left-0 top-0 flex -translate-x-[calc(50%+80px)] -translate-y-[78px] flex-col items-center gap-1.5">
              <button
                type="button"
                role="menuitem"
                aria-label="Favoritos"
                onClick={() => handleDockSelect('favorites')}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] shadow-[0_10px_24px_rgba(2,10,18,0.92)] transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${
                  activeSection === 'favorites'
                    ? 'border-warning bg-bg-deep text-warning'
                    : 'border-text-muted bg-bg-elevated text-warning hover:border-warning'
                }`}
              >
                <Bookmark
                  className={`h-5 w-5 text-warning ${
                    activeSection === 'favorites' ? 'fill-warning' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              <span
                aria-hidden="true"
                className={`pointer-events-none select-none whitespace-nowrap font-mono text-[11px] font-medium leading-none drop-shadow-[0_1px_4px_rgba(6,28,44,0.95)] ${
                  activeSection === 'favorites' ? 'text-warning' : 'text-text-primary'
                }`}
              >
                Favoritos
              </span>
            </div>

            {/* Centro superior: Enviar Clipe (destaque #2EB886) */}
            <div
              className="radial-dock-item pointer-events-auto absolute left-0 top-0 flex -translate-x-1/2 -translate-y-[116px] flex-col items-center gap-1.5"
              style={{ animationDelay: '40ms' }}
            >
              <button
                type="button"
                role="menuitem"
                aria-label="Enviar Clipe"
                onClick={handleUploadAction}
                className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-success bg-success text-bg-deep shadow-[0_10px_26px_rgba(2,10,18,0.92),0_0_22px_rgba(46,184,134,0.5)] transition-all duration-200 hover:scale-105 hover:bg-success-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
              >
                <Upload className="h-5 w-5" aria-hidden="true" />
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none select-none whitespace-nowrap font-mono text-[11px] font-semibold leading-none text-success drop-shadow-[0_1px_4px_rgba(6,28,44,0.95)]"
              >
                Enviar Clipe
              </span>
            </div>

            {/* Direita superior: Estúdio */}
            <div
              className="radial-dock-item pointer-events-auto absolute left-0 top-0 flex -translate-x-[calc(50%-80px)] -translate-y-[78px] flex-col items-center gap-1.5"
              style={{ animationDelay: '80ms' }}
            >
              <button
                type="button"
                role="menuitem"
                aria-label="Estúdio"
                onClick={() => handleDockSelect('studio')}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] shadow-[0_10px_24px_rgba(2,10,18,0.92)] transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${
                  activeSection === 'studio'
                    ? 'border-success bg-bg-deep text-success'
                    : 'border-text-muted bg-bg-elevated text-success hover:border-success'
                }`}
              >
                <BarChart3 className="h-5 w-5 text-success" aria-hidden="true" />
              </button>
              <span
                aria-hidden="true"
                className={`pointer-events-none select-none whitespace-nowrap font-mono text-[11px] font-medium leading-none drop-shadow-[0_1px_4px_rgba(6,28,44,0.95)] ${
                  activeSection === 'studio' ? 'text-success' : 'text-text-primary'
                }`}
              >
                Estúdio
              </span>
            </div>
          </div>
        )}

        {/* Botão central flutuante (+ gira 45° para X ao abrir) */}
        <button
          ref={fabRef}
          type="button"
          data-testid="mobile-dock-fab"
          aria-expanded={isRadialOpen}
          aria-controls="mobile-radial-menu"
          aria-label={isRadialOpen ? 'Fechar menu rápido' : 'Abrir menu rápido'}
          onClick={handleToggleRadial}
          className={`pointer-events-auto absolute -top-6 left-1/2 z-50 flex h-[52px] w-[52px] -translate-x-1/2 touch-manipulation items-center justify-center rounded-full border-2 transition-all duration-300 ease-out [-webkit-tap-highlight-color:transparent] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${
            isRadialOpen
              ? 'border-success bg-success text-bg-deep shadow-[0_6px_18px_rgba(46,184,134,0.4)]'
              : 'border-[rgba(46,184,134,0.6)] bg-bg-deep text-success shadow-[0_6px_16px_rgba(0,0,0,0.45)]'
          }`}
        >
          <Plus
            className={`h-6 w-6 transition-transform duration-300 ease-out ${
              isRadialOpen ? 'rotate-45' : 'rotate-0'
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Dock flutuante com recorte côncavo SVG central e superfície elevada (bg-elevated) */}
        <nav
          aria-label="Navegação principal mobile"
          data-testid="mobile-floating-dock"
          className="pointer-events-auto relative h-16 w-full [filter:drop-shadow(0_14px_28px_rgba(2,10,18,0.95))_drop-shadow(0_-4px_14px_rgba(2,10,18,0.65))]"
        >
          {/* Camada de fundo líquida sem distorção (asa esquerda + berço SVG central + asa direita) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex">
            <div className="h-full flex-1 rounded-l-bento border-y-[1.5px] border-l-[1.5px] border-text-muted bg-bg-elevated" />
            <svg
              width="96"
              height="64"
              viewBox="0 0 96 64"
              fill="none"
              className="-mx-[1px] h-16 w-[96px] shrink-0"
            >
              <path
                d="M 0 0.75 C 16 0.75, 19 33, 48 33 C 77 33, 80 0.75, 96 0.75 L 96 63.25 L 0 63.25 Z"
                fill="var(--bg-elevated)"
              />
              <path
                d="M 0 0.75 C 16 0.75, 19 33, 48 33 C 77 33, 80 0.75, 96 0.75"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              />
              <line
                x1="0"
                y1="63.25"
                x2="96"
                y2="63.25"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              />
            </svg>
            <div className="h-full flex-1 rounded-r-bento border-y-[1.5px] border-r-[1.5px] border-text-muted bg-bg-elevated" />
          </div>

          {/* 4 itens principais com espaço central dedicado ao recorte */}
          <div className="relative z-10 grid h-full grid-cols-[1fr_1fr_76px_1fr_1fr] items-center px-1.5">
            {LEFT_DOCK_ITEMS.map((item) => (
              <DockNavButton
                key={item.id}
                item={item}
                activeSection={activeSection}
                onSelect={handleDockSelect}
              />
            ))}

            <div aria-hidden="true" className="h-full" />

            {RIGHT_DOCK_ITEMS.map((item) => (
              <DockNavButton
                key={item.id}
                item={item}
                activeSection={activeSection}
                onSelect={handleDockSelect}
              />
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
