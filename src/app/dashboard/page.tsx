'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  LogOut,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { authService } from '@/services/auth-service';

function ProvisionalDashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

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

  const handleResendVerification = async () => {
    if (!user?.email) {
      return;
    }
    setIsResendingVerification(true);
    try {
      const response = await authService.resendVerification(user.email);
      success(response.message);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível reenviar o e-mail de verificação.';
      showErrorToast(message);
    } finally {
      setIsResendingVerification(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-bg-deep px-4 py-8 text-text-primary md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <Film className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                  CLIPAÍ
                </h1>
                <span className="rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
                  BETA
                </span>
                <span className="rounded-control border border-border-muted bg-bg-elevated px-2 py-0.5 font-mono text-mono-badge uppercase text-text-secondary">
                  DASHBOARD PROVISÓRIO • SPRINT 1
                </span>
              </div>
              <p className="font-mono text-mono-meta text-text-secondary">
                Sessão autenticada validada com JWT em memória e cookie HttpOnly
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="danger"
            size="md"
            isLoading={isLoggingOut}
            loadingText="SAINDO..."
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={() => void handleLogout()}
          >
            SAIR
          </Button>
        </header>

        <section
          aria-labelledby="heading-session-user"
          className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
              <h2
                id="heading-session-user"
                className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
              >
                DADOS DA CONTA AUTENTICADA
              </h2>
            </div>

            {user.is_email_verified ? (
              <span
                data-testid="email-verified-badge"
                className="inline-flex items-center gap-1.5 rounded-control border border-success bg-success-surface px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                E-MAIL VERIFICADO
              </span>
            ) : (
              <span
                data-testid="email-pending-badge"
                className="inline-flex items-center gap-1.5 rounded-control border border-warning bg-bg-deep px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-warning"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                E-MAIL NÃO VERIFICADO
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-border-muted bg-bg-deep p-4">
              <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                USERNAME
              </span>
              <p className="mt-1.5 font-mono text-mono-body font-semibold text-text-primary">
                @{user.username}
              </p>
            </div>

            <div className="rounded-card border border-border-muted bg-bg-deep p-4">
              <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                NOME DE EXIBIÇÃO
              </span>
              <p className="mt-1.5 font-mono text-mono-body font-semibold text-text-primary">
                {user.display_name}
              </p>
            </div>

            <div className="rounded-card border border-border-muted bg-bg-deep p-4">
              <span className="flex items-center gap-1.5 font-mono text-mono-badge uppercase text-text-muted">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                E-MAIL
              </span>
              <p className="mt-1.5 truncate font-mono text-mono-body font-semibold text-text-primary">
                {user.email}
              </p>
            </div>
          </div>

          {!user.is_email_verified && (
            <div className="mt-5 flex flex-col justify-between gap-4 rounded-card border border-warning bg-bg-deep p-4 sm:flex-row sm:items-center">
              <p className="font-mono text-mono-meta text-text-secondary">
                Confirme seu e-mail para liberar o envio de clipes e criação de coleções nas
                próximas sprints.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={isResendingVerification}
                loadingText="Reenviando..."
                onClick={() => void handleResendVerification()}
              >
                Reenviar verificação
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProvisionalDashboardPage() {
  return (
    <AuthGuard>
      <ProvisionalDashboardContent />
    </AuthGuard>
  );
}
