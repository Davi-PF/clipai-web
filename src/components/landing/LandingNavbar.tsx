'use client';

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';

export function LandingNavbar() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border-muted bg-bg-deep/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5 md:px-8">
        {/* Marca CLIPAÍ + BETA */}
        <Link
          href="/"
          className="inline-flex min-w-0 shrink-0 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <BrandLogo
            variant="horizontal"
            size="md"
            showBeta
            betaClassName="hidden sm:inline-flex"
          />
        </Link>

        {/* Links âncora */}
        <nav aria-label="Navegação da landing page" className="hidden items-center gap-6 md:flex">
          <a
            href="#recursos"
            className="inline-flex h-10 items-center font-mono text-mono-meta leading-none text-text-secondary transition-colors hover:text-text-primary"
          >
            Recursos
          </a>
          <a
            href="#como-funciona"
            className="inline-flex h-10 items-center font-mono text-mono-meta leading-none text-text-secondary transition-colors hover:text-text-primary"
          >
            Como Funciona
          </a>
          <a
            href="#estudio"
            className="inline-flex h-10 items-center font-mono text-mono-meta leading-none text-text-secondary transition-colors hover:text-text-primary"
          >
            Estúdio
          </a>
        </nav>

        {/* Ações à direita (Visitante vs Autenticado) */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {!isLoading && isAuthenticated && user ? (
            <>
              <Link
                href="/settings"
                data-testid="landing-nav-user"
                title={user.username}
                aria-label={`Abrir configurações da conta (${user.username})`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-muted bg-bg-surface transition-colors hover:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
              >
                <UserAvatar
                  username={user.username}
                  displayName={user.display_name}
                  avatarUrl={user.avatar_url}
                  size="md"
                  className="border-0"
                />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="h-10"
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
                className="inline-flex h-10 items-center justify-center rounded-control border border-border-muted bg-bg-surface px-3.5 font-mono text-mono-meta font-medium leading-none text-text-primary transition-colors hover:border-success"
              >
                ENTRAR
              </Link>
              <Link href="/register" className="inline-flex items-center">
                <Button type="button" variant="primary" size="sm" className="h-10">
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
