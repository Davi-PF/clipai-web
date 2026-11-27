'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Lock, Mail, User as UserIcon, UserPlus } from 'lucide-react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { DiscordOAuthButton } from '@/components/auth/DiscordOAuthButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError, getAccessToken } from '@/lib/api-client';
import {
  acceptPendingInviteIfPresent,
  capturePendingInviteCode,
  clearPendingInviteCode,
} from '@/lib/pending-invite';
import {
  validateDisplayName,
  validateEmail,
  validatePasswordConfirmation,
  validatePasswordStrength,
  validateUsername,
} from '@/lib/validators';
import { authService } from '@/services/auth-service';
import type { RegisterRequest } from '@/types/api';

interface RegisterFieldErrors {
  username?: string;
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export function RegisterForm() {
  const { register } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  useEffect(() => {
    setPendingInviteCode(capturePendingInviteCode());
  }, []);

  const validateFields = (): boolean => {
    const nextErrors: RegisterFieldErrors = {};

    const usernameResult = validateUsername(username);
    if (!usernameResult.valid && usernameResult.errorMessage) {
      nextErrors.username = usernameResult.errorMessage;
    }

    const displayResult = validateDisplayName(displayName);
    if (!displayResult.valid && displayResult.errorMessage) {
      nextErrors.displayName = displayResult.errorMessage;
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid && emailResult.errorMessage) {
      nextErrors.email = emailResult.errorMessage;
    }

    const passwordResult = validatePasswordStrength(password);
    if (!passwordResult.valid && passwordResult.errorMessage) {
      nextErrors.password = passwordResult.errorMessage;
    }

    const confirmResult = validatePasswordConfirmation(password, confirmPassword);
    if (!confirmResult.valid && confirmResult.errorMessage) {
      nextErrors.confirmPassword = confirmResult.errorMessage;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateFields()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const normalizedEmail = email.trim();
    const activeInviteCode = capturePendingInviteCode();
    try {
      const registerPayload: RegisterRequest = activeInviteCode
        ? {
            username: username.trim(),
            display_name: displayName.trim(),
            email: normalizedEmail,
            password,
            invite_code: activeInviteCode,
          }
        : {
            username: username.trim(),
            display_name: displayName.trim(),
            email: normalizedEmail,
            password,
          };

      const response = await register(registerPayload);

      setRegisteredEmail(response.user.email || normalizedEmail);
      success(response.message);

      if (activeInviteCode) {
        if (getAccessToken()) {
          const accepted = await acceptPendingInviteIfPresent();
          if (accepted) {
            success(
              accepted.message ||
                `Convite aceito! Você e @${accepted.inviter.username} agora são amigos.`,
            );
          }
        } else {
          clearPendingInviteCode();
          success('Convite aplicado! Vocês já foram conectados como amigos no CLIPAÍ.');
        }
        setPendingInviteCode(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível concluir seu cadastro. Tente novamente.';
      setErrors({ form: message });
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) {
      return;
    }
    setIsResending(true);
    try {
      const response = await authService.resendVerification(registeredEmail);
      success(response.message);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível reenviar o e-mail de verificação.';
      showErrorToast(message);
    } finally {
      setIsResending(false);
    }
  };

  if (registeredEmail) {
    return (
      <AuthCardLayout
        title="CONFIRME SEU E-MAIL"
        subtitle="Falta apenas um passo para liberar o envio de clipes na plataforma."
        footer={
          <p className="text-center">
            Já confirmou seu e-mail?{' '}
            <Link
              href="/login"
              className="font-semibold text-success transition-colors hover:underline"
            >
              Ir para o login
            </Link>
          </p>
        }
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-card border border-success bg-success-surface p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div className="space-y-1 font-mono text-mono-body text-text-primary">
              <p className="font-semibold">Cadastro realizado com sucesso!</p>
              <p className="text-mono-meta">
                Enviamos um link de confirmação para{' '}
                <strong className="text-text-primary">{registeredEmail}</strong>. Verifique sua
                caixa de entrada e a pasta de spam.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            isLoading={isResending}
            loadingText="REENVIANDO..."
            onClick={() => void handleResendVerification()}
          >
            Reenviar e-mail de verificação
          </Button>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="CRIAR CONTA NO CLIPAÍ"
      subtitle="Monte seu perfil de jogador e comece a guardar suas melhores jogadas."
      footer={
        <p className="text-center">
          Já possui uma conta?{' '}
          <Link
            href={
              pendingInviteCode
                ? `/login?invite=${encodeURIComponent(pendingInviteCode)}`
                : '/login'
            }
            className="font-semibold text-success transition-colors hover:underline"
          >
            Fazer login
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {pendingInviteCode && (
          <div
            data-testid="register-invite-banner"
            className="flex items-start gap-2.5 rounded-card border border-success bg-success-surface/50 p-3 font-mono text-mono-meta text-text-primary"
          >
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Convite detectado! Ao criar sua conta, a amizade será confirmada automaticamente.
            </span>
          </div>
        )}
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
            label="Nome de usuário (username)"
            type="text"
            name="username"
            autoComplete="username"
            placeholder="fallen_br"
            hint="3 a 30 caracteres (letras, números e _)"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={errors.username}
            leftIcon={<UserIcon className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <Input
            label="Nome de exibição"
            type="text"
            name="display_name"
            autoComplete="name"
            placeholder="Gabriel Toledo"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            error={errors.displayName}
            leftIcon={<UserIcon className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <Input
            label="E-mail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="jogador@clipai.com.br"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <Input
            label="Senha"
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
            label="Confirmar senha"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repita sua senha"
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
            loadingText="CRIANDO CONTA..."
          >
            CRIAR CONTA
          </Button>
        </form>

        <DiscordOAuthButton
          mode="login"
          label="ENTRAR COM DISCORD"
          disabled={isSubmitting}
          onError={(msg) => setErrors({ form: msg })}
        />
      </div>
    </AuthCardLayout>
  );
}
