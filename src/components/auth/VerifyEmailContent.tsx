'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { validateEmail } from '@/lib/validators';
import { authService } from '@/services/auth-service';

type VerificationStatus = 'loading' | 'success' | 'error';

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { isAuthenticated, refreshSession } = useAuth();
  const { success, error: showErrorToast } = useToast();
  const authStateRef = useRef({ isAuthenticated, refreshSession });
  authStateRef.current = { isAuthenticated, refreshSession };

  const [status, setStatus] = useState<VerificationStatus>(token ? 'loading' : 'error');
  const [message, setMessage] = useState<string>(
    token
      ? 'Validando seu token de confirmação...'
      : 'Token de verificação ausente ou inválido na URL.',
  );

  const [resendEmail, setResendEmail] = useState('');
  const [resendError, setResendError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação ausente ou inválido na URL.');
      return;
    }

    let isActive = true;

    async function confirmToken() {
      setStatus('loading');
      try {
        const response = await authService.verifyEmail(token);
        if (!isActive) {
          return;
        }
        setStatus('success');
        setMessage(response.message);
        if (authStateRef.current.isAuthenticated) {
          await authStateRef.current.refreshSession();
        }
      } catch (err: unknown) {
        if (!isActive) {
          return;
        }
        setStatus('error');
        setMessage(
          err instanceof ApiClientError
            ? err.message
            : 'Token de verificação inválido ou expirado.',
        );
      }
    }

    void confirmToken();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateEmail(resendEmail);
    if (!validation.valid) {
      setResendError(validation.errorMessage);
      return;
    }

    setResendError(null);
    setIsResending(true);

    try {
      const response = await authService.resendVerification(resendEmail.trim());
      success(response.message);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível reenviar o link de verificação.';
      showErrorToast(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCardLayout
      title="VERIFICAÇÃO DE E-MAIL"
      subtitle="Confirmação da sua conta para envio e interação com clipes."
      footer={
        <p className="text-center">
          <Link
            href="/login"
            className="font-semibold text-success transition-colors hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      }
    >
      {status === 'loading' && (
        <div
          aria-busy="true"
          className="flex flex-col items-center gap-3 rounded-card border border-border-muted bg-bg-deep p-6 text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-success" aria-hidden="true" />
          <p className="font-mono text-mono-body text-text-primary">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-card border border-success bg-success-surface p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="font-mono text-mono-body text-text-primary">{message}</p>
          </div>

          <Link href={isAuthenticated ? '/dashboard' : '/login'} className="block">
            <Button type="button" variant="primary" fullWidth>
              {isAuthenticated ? 'IR PARA O DASHBOARD' : 'IR PARA O LOGIN'}
            </Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-5">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-card border border-danger bg-danger-surface p-4"
          >
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-text" aria-hidden="true" />
            <p className="font-mono text-mono-body text-danger-text">{message}</p>
          </div>

          <form onSubmit={(event) => void handleResend(event)} noValidate className="space-y-3">
            <Input
              label="Solicitar novo link de verificação"
              type="email"
              name="email"
              placeholder="seu-email@exemplo.com.br"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              error={resendError}
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={isResending}
            />
            <Button
              type="submit"
              variant="secondary"
              fullWidth
              isLoading={isResending}
              loadingText="Enviando..."
            >
              Reenviar e-mail de verificação
            </Button>
          </form>
        </div>
      )}
    </AuthCardLayout>
  );
}
