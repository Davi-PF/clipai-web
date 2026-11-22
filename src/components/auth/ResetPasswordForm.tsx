'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Lock, XCircle } from 'lucide-react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { validatePasswordConfirmation, validatePasswordStrength } from '@/lib/validators';
import { authService } from '@/services/auth-service';

interface ResetFieldErrors {
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { success, error: showErrorToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  const validateFields = (): boolean => {
    const nextErrors: ResetFieldErrors = {};

    const strengthResult = validatePasswordStrength(password);
    if (!strengthResult.valid && strengthResult.errorMessage) {
      nextErrors.password = strengthResult.errorMessage;
    }

    const confirmResult = validatePasswordConfirmation(password, confirmPassword);
    if (!confirmResult.valid && confirmResult.errorMessage) {
      nextErrors.confirmPassword = confirmResult.errorMessage;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !validateFields()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await authService.resetPassword({
        token,
        new_password: password,
      });
      setCompletedMessage(response.message);
      success(response.message);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível redefinir sua senha. Solicite um novo link.';
      setErrors({ form: message });
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthCardLayout
        title="REDEFINIR SENHA"
        subtitle="Token de recuperação ausente ou inválido."
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
        <div className="space-y-5">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-card border border-danger bg-danger-surface p-4"
          >
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-text" aria-hidden="true" />
            <p className="font-mono text-mono-body text-danger-text">
              O link de redefinição está incompleto ou expirado. Solicite um novo link.
            </p>
          </div>
          <Link href="/forgot-password" className="block">
            <Button type="button" variant="primary" fullWidth>
              SOLICITAR NOVO LINK
            </Button>
          </Link>
        </div>
      </AuthCardLayout>
    );
  }

  if (completedMessage) {
    return (
      <AuthCardLayout
        title="SENHA REDEFINIDA"
        subtitle="Todas as sessões anteriores foram encerradas por segurança."
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-card border border-success bg-success-surface p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="font-mono text-mono-body text-text-primary">{completedMessage}</p>
          </div>

          <Link href="/login" className="block">
            <Button type="button" variant="primary" fullWidth>
              FAZER LOGIN COM NOVA SENHA
            </Button>
          </Link>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="NOVA SENHA"
      subtitle="Defina uma nova senha forte para acessar sua conta."
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
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
        {errors.form && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errors.form}</span>
          </div>
        )}

        <Input
          label="Nova senha"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          hint="Inclua maiúscula, minúscula, número e caractere especial."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          disabled={isSubmitting}
        />

        <Input
          label="Confirmar nova senha"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repita sua nova senha"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          leftIcon={<Lock className="h-4 w-4" />}
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          loadingText="SALVANDO SENHA..."
        >
          REDEFINIR SENHA
        </Button>
      </form>
    </AuthCardLayout>
  );
}
