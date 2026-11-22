'use client';

import Link from 'next/link';
import { Film, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { getUserDisplayName } from '@/types/user';

export function LandingNavbar() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border-muted bg-bg-deep/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 md:px-8">
        {/* Marca CLIPAÍ + BETA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-card border border-border-muted bg-bg-surface">
            <Film className="h-4 w-4 text-success" aria-hidden="true" />
          </span>
          <span className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
            CLIPAÍ
          </span>
          <span className="rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
            BETA
          </span>
        </Link>

        {/* Links âncora */}
        <nav aria-label="Navegação da landing page" className="hidden items-center gap-6 md:flex">
          <a
            href="#recursos"
            className="font-mono text-mono-meta text-text-secondary transition-colors hover:text-text-primary"
          >
            Recursos
          </a>
          <a
            href="#como-funciona"
            className="font-mono text-mono-meta text-text-secondary transition-colors hover:text-text-primary"
          >
            Como Funciona
          </a>
          <a
            href="#estudio"
            className="font-mono text-mono-meta text-text-secondary transition-colors hover:text-text-primary"
          >
            Estúdio
          </a>
        </nav>

        {/* Ações à direita (Visitante vs Autenticado) */}
        <div className="flex items-center gap-2.5">
          {!isLoading && isAuthenticated && user ? (
            <>
              <Link
                href="/settings"
                data-testid="landing-nav-user"
                className="hidden items-center gap-2 rounded-control border border-border-muted bg-bg-surface px-2.5 py-1.5 transition-colors hover:border-success sm:inline-flex"
              >
                <UserAvatar
                  username={user.username}
                  displayName={user.display_name}
                  avatarUrl={user.avatar_url}
                  size="xs"
                />
                <span className="max-w-[140px] truncate font-mono text-mono-meta text-text-primary">
                  {getUserDisplayName(user)}
                </span>
              </Link>
              <Link href="/dashboard">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<LayoutDashboard className="h-4 w-4" />}
                >
                  ABRIR DASHBOARD
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-9 items-center rounded-control border border-border-muted bg-bg-surface px-3.5 py-2 font-mono text-mono-meta font-medium text-text-primary transition-colors hover:border-success"
              >
                ENTRAR
              </Link>
              <Link href="/register">
                <Button type="button" variant="primary" size="sm">
                  CRIAR CONTA
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
