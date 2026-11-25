'use client';

import { useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Lock, Mail } from 'lucide-react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { DiscordOAuthButton } from '@/components/auth/DiscordOAuthButton';
import { TwoFactorChallengeStep } from '@/components/auth/TwoFactorChallengeStep';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { validateEmail, validateLoginPassword } from '@/lib/validators';
import { resolveChallengeToken } from '@/types/auth';

interface LoginFieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

function getSafeRedirectTarget(): string {
  if (typeof window === 'undefined') {
    return '/dashboard';
  }
  const param = new URLSearchParams(window.location.search).get('redirect');
  if (param && param.startsWith('/') && !param.startsWith('//')) {
    return param;
  }
  return '/dashboard';
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null);

  const validateFields = (): boolean => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validateLoginPassword(password);
    const nextErrors: LoginFieldErrors = {};

    if (!emailValidation.valid && emailValidation.errorMessage) {
      nextErrors.email = emailValidation.errorMessage;
    }
    if (!passwordValidation.valid && passwordValidation.errorMessage) {
      nextErrors.password = passwordValidation.errorMessage;
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

    try {
      const response = await login({ email: email.trim(), password });

      if (response.requires_2fa) {
        const token = resolveChallengeToken(response);
        if (!token) {
          setErrors({
            form: 'Não foi possível iniciar o desafio de verificação em duas etapas.',
          });
          return;
        }
        setChallengeToken(token);
        setChallengeEmail(response.user?.email ?? email.trim());
        return;
      }

      success('Login realizado com sucesso! Bem-vindo de volta.');
      router.replace(getSafeRedirectTarget());
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível realizar o login. Tente novamente.';
      setErrors({ form: message });
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (challengeToken) {
    return (
      <AuthCardLayout
        title="VERIFICAÇÃO EM 2 ETAPAS (2FA)"
        subtitle="Confirme sua identidade com o código do autenticador ou código de backup."
      >
        <TwoFactorChallengeStep
          challengeToken={challengeToken}
          userEmail={challengeEmail}
          onSuccess={() => router.replace(getSafeRedirectTarget())}
          onCancel={() => {
            setChallengeToken(null);
            setChallengeEmail(null);
            setPassword('');
          }}
        />
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="ENTRAR NO CLIPAÍ"
      subtitle="Acesse sua conta para enviar, organizar e compartilhar seus clipes."
      footer={
        <p className="text-center">
          Ainda não tem uma conta?{' '}
          <Link
            href="/register"
            className="font-semibold text-success transition-colors hover:underline"
          >
            Criar conta
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
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

          <div className="space-y-1.5">
            <Input
              label="Senha"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="font-mono text-mono-meta text-text-secondary transition-colors hover:text-success"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            loadingText="ENTRANDO..."
          >
            ENTRAR
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
