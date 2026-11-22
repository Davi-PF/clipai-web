'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function GuestGuard({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main
        aria-busy="true"
        aria-label="Carregando sessão"
        className="flex min-h-screen items-center justify-center bg-bg-deep px-4"
      >
        <div className="flex items-center gap-3 rounded-card border border-border-muted bg-bg-surface px-5 py-4 font-mono text-mono-body text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-success" aria-hidden="true" />
          <span>Carregando...</span>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
