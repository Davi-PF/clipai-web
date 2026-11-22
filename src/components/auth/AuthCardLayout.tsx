import Link from 'next/link';
import { Film } from 'lucide-react';
import type { ReactNode } from 'react';

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
            className="inline-flex items-center gap-3 rounded-control px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-card border border-border-muted bg-bg-surface">
              <Film className="h-5 w-5 text-success" aria-hidden="true" />
            </span>
            <span className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
              CLIPAÍ
            </span>
            <span className="rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
              BETA
            </span>
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
