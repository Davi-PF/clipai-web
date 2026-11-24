import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export interface AuthCardLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCardLayout({
  title,
  subtitle,
  children,
  footer,
}: Readonly<AuthCardLayoutProps>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-4 py-10 text-text-primary">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="inline-flex items-center rounded-control px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
          >
            <BrandLogo variant="horizontal" size="lg" showBeta />
          </Link>
        </div>

        <section
          aria-labelledby="auth-card-title"
          className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 sm:p-8"
        >
          <header className="mb-6 space-y-1.5">
            <h1
              id="auth-card-title"
              className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary"
            >
              {title}
            </h1>
            <p className="font-mono text-mono-meta text-text-secondary">{subtitle}</p>
          </header>

          {children}

          {footer && (
            <footer className="mt-6 border-t border-border-muted pt-5 font-mono text-mono-meta text-text-secondary">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
