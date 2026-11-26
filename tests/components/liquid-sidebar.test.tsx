import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LiquidSidebar, type DashboardSection } from '@/components/dashboard/LiquidSidebar';
import type { User } from '@/types/api';

const SAMPLE_USER: User = {
  id: 'u1',
  username: 'fallen_br',
  email: 'gabriel@clipai.com.br',
  display_name: 'Gabriel Toledo',
  avatar_url: null,
  is_email_verified: true,
  is_2fa_enabled: false,
};

function renderSidebar(overrides?: {
  activeSection?: DashboardSection;
  isCollapsed?: boolean;
  onSelectSection?: (section: DashboardSection) => void;
  onOpenUpload?: () => void;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
}) {
  const onSelectSection = overrides?.onSelectSection ?? vi.fn();
  const onToggleCollapse = overrides?.onToggleCollapse ?? vi.fn();
  const onLogout = overrides?.onLogout ?? vi.fn();

  const utils = render(
    <LiquidSidebar
      activeSection={overrides?.activeSection ?? 'home'}
      onSelectSection={onSelectSection}
      onOpenUpload={overrides?.onOpenUpload}
      isCollapsed={overrides?.isCollapsed ?? false}
      onToggleCollapse={onToggleCollapse}
      showInlineCollapseToggle
      user={SAMPLE_USER}
      isLoggingOut={false}
      onLogout={onLogout}
    />,
  );

  return {
    ...utils,
    onSelectSection,
    onToggleCollapse,
    onLogout,
  };
}

describe('LiquidSidebar & MobileFloatingDock', () => {
  it('renders the 4 primary mobile dock items without truncation and highlights the active section', async () => {
    const user = userEvent.setup();
    const { onSelectSection, rerender } = renderSidebar({ activeSection: 'home' });

    const mobileDock = screen.getByTestId('mobile-floating-dock');
    const bgSvg = within(mobileDock).getByTestId('mobile-dock-bg-svg');
    expect(bgSvg).toHaveClass('h-full', 'w-full');
    expect(within(mobileDock).getByTestId('mobile-dock-bg-fill')).toHaveAttribute(
      'fill',
      'var(--bg-elevated)',
    );
    expect(within(mobileDock).getByTestId('mobile-dock-bg-stroke')).toHaveAttribute(
      'stroke',
      'var(--text-muted)',
    );

    const homeBtn = within(mobileDock).getByRole('button', { name: 'Início' });
    const exploreBtn = within(mobileDock).getByRole('button', { name: 'Explorar' });
    const collectionsBtn = within(mobileDock).getByRole('button', { name: 'Coleções' });
    const profileBtn = within(mobileDock).getByRole('button', { name: 'Perfil' });

    for (const label of ['Início', 'Explorar', 'Coleções', 'Perfil']) {
      expect(within(mobileDock).getByText(label)).toHaveClass('whitespace-nowrap');
    }

    expect(homeBtn).toHaveAttribute('aria-current', 'page');
    expect(within(mobileDock).getByTestId('mobile-dock-active-indicator-home')).toBeInTheDocument();
    expect(exploreBtn).not.toHaveAttribute('aria-current');

    await user.click(exploreBtn);
    expect(onSelectSection).toHaveBeenCalledWith('featured');

    await user.click(collectionsBtn);
    expect(onSelectSection).toHaveBeenCalledWith('collections');

    await user.click(profileBtn);
    expect(onSelectSection).toHaveBeenCalledWith('settings');

    // Rerender with 'most_viewed' active -> Explorar is highlighted and Mais Vistos nav is active
    rerender(
      <LiquidSidebar
        activeSection="most_viewed"
        onSelectSection={onSelectSection}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        user={SAMPLE_USER}
        isLoggingOut={false}
        onLogout={vi.fn()}
      />,
    );
    expect(within(mobileDock).getByRole('button', { name: 'Explorar' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(mobileDock).getByTestId('mobile-dock-active-indicator-explore'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mais Vistos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('toggles the central floating + button (rotates 45deg), opens radial actions and triggers callbacks', async () => {
    const user = userEvent.setup();
    const onOpenUpload = vi.fn();
    const { onSelectSection } = renderSidebar({
      activeSection: 'home',
      onOpenUpload,
    });

    const fab = screen.getByTestId('mobile-dock-fab');
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    expect(fab.querySelector('svg')).toHaveClass('rotate-0');
    expect(screen.queryByTestId('mobile-radial-menu')).not.toBeInTheDocument();

    // Open radial menu
    await user.click(fab);
    expect(fab).toHaveAttribute('aria-expanded', 'true');
    expect(fab.querySelector('svg')).toHaveClass('rotate-45');

    const radialMenu = screen.getByTestId('mobile-radial-menu');
    const uploadItem = within(radialMenu).getByRole('menuitem', { name: 'Enviar Clipe' });
    const favoritesItem = within(radialMenu).getByRole('menuitem', { name: 'Favoritos' });
    const studioItem = within(radialMenu).getByRole('menuitem', { name: 'Estúdio' });
    expect(uploadItem).toHaveClass('rounded-full');
    expect(favoritesItem).toHaveClass('rounded-full');
    expect(studioItem).toHaveClass('rounded-full');

    // Click Enviar Clipe -> triggers onOpenUpload and closes radial menu
    await user.click(uploadItem);
    expect(onOpenUpload).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('mobile-radial-menu')).not.toBeInTheDocument();
    expect(fab).toHaveAttribute('aria-expanded', 'false');

    // Reopen and click Favoritos
    await user.click(fab);
    await user.click(screen.getByRole('menuitem', { name: 'Favoritos' }));
    expect(onSelectSection).toHaveBeenCalledWith('favorites');
    expect(screen.queryByTestId('mobile-radial-menu')).not.toBeInTheDocument();

    // Reopen and click Estúdio
    await user.click(fab);
    await user.click(screen.getByRole('menuitem', { name: 'Estúdio' }));
    expect(onSelectSection).toHaveBeenCalledWith('studio');
    expect(screen.queryByTestId('mobile-radial-menu')).not.toBeInTheDocument();
  });

  it('closes the mobile radial menu when clicking the backdrop or pressing Escape, and falls back when onOpenUpload is absent', async () => {
    const user = userEvent.setup();
    const { onSelectSection } = renderSidebar({ activeSection: 'favorites' });

    const fab = screen.getByTestId('mobile-dock-fab');

    // Open and close via backdrop click
    await user.click(fab);
    const backdrop = screen.getByTestId('mobile-dock-backdrop');
    expect(backdrop).toBeInTheDocument();

    await user.click(backdrop);
    expect(screen.queryByTestId('mobile-radial-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-dock-backdrop')).not.toBeInTheDocument();

    // Open and close via Escape key
    await user.click(fab);
    expect(screen.getByTestId('mobile-radial-menu')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-radial-menu')).not.toBeInTheDocument();

    // Open and click Enviar Clipe without onOpenUpload -> falls back to home
    await user.click(fab);
    await user.click(screen.getByRole('menuitem', { name: 'Enviar Clipe' }));
    expect(onSelectSection).toHaveBeenCalledWith('home');
  });

  it('supports mobile header profile/logout actions and desktop collapse toggle', async () => {
    const user = userEvent.setup();
    const { onSelectSection, onToggleCollapse, onLogout } = renderSidebar({
      activeSection: 'studio',
    });

    await user.click(screen.getByRole('button', { name: 'Abrir configurações do perfil' }));
    expect(onSelectSection).toHaveBeenCalledWith('settings');

    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(onLogout).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Recolher sidebar' }));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('restores the central FAB to its default visual style and blurs focus whenever the radial menu closes', async () => {
    const user = userEvent.setup();
    renderSidebar({ activeSection: 'home', onOpenUpload: vi.fn() });

    const fab = screen.getByTestId('mobile-dock-fab');

    // Initial closed state: dark fill, subtle green border, green + icon, soft floating shadow, no sticky hover
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    expect(fab).toHaveClass(
      'border-[rgba(46,184,134,0.6)]',
      'bg-bg-deep',
      'text-success',
      'shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
    );
    expect(fab).not.toHaveClass('bg-success', 'hover:bg-success');

    // Open menu -> filled active green state
    await user.click(fab);
    expect(fab).toHaveAttribute('aria-expanded', 'true');
    expect(fab).toHaveClass('border-success', 'bg-success', 'text-bg-deep');

    // Close by clicking X (the FAB itself) -> returns to subtle green border style and blurs
    await user.click(fab);
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    expect(fab).toHaveClass(
      'border-[rgba(46,184,134,0.6)]',
      'bg-bg-deep',
      'text-success',
      'shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
    );
    expect(fab).not.toHaveClass('bg-success');
    expect(document.activeElement).not.toBe(fab);

    // Reopen and close via backdrop -> returns to default style and blurs
    await user.click(fab);
    expect(fab).toHaveClass('bg-success');
    await user.click(screen.getByTestId('mobile-dock-backdrop'));
    expect(fab).toHaveClass(
      'border-[rgba(46,184,134,0.6)]',
      'bg-bg-deep',
      'text-success',
      'shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
    );
    expect(fab).not.toHaveClass('bg-success');
    expect(document.activeElement).not.toBe(fab);

    // Reopen and close via radial option -> returns to default style and blurs
    await user.click(fab);
    await user.click(screen.getByRole('menuitem', { name: 'Favoritos' }));
    expect(fab).toHaveClass(
      'border-[rgba(46,184,134,0.6)]',
      'bg-bg-deep',
      'text-success',
      'shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
    );
    expect(fab).not.toHaveClass('bg-success');
    expect(document.activeElement).not.toBe(fab);
  });
});
