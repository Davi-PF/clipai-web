'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail } from 'lucide-react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { validateEmail } from '@/lib/validators';
import { authService } from '@/services/auth-service';

export function ForgotPasswordForm() {
  const { success, error: showErrorToast } = useToast();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateEmail(email);
    if (!validation.valid) {
      setEmailError(validation.errorMessage);
      return;
    }

    setEmailError(null);
    setIsSubmitting(true);

    try {
      const response = await authService.forgotPassword(email.trim());
      setSentMessage(response.message);
      success('Solicitação processada. Verifique sua caixa de entrada.');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível enviar as instruções de recuperação.';
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="RECUPERAR SENHA"
      subtitle="Informe seu e-mail cadastrado para receber um link de redefinição."
      footer={
        <p className="text-center">
          Lembrou sua senha?{' '}
          <Link
            href="/login"
            className="font-semibold text-success transition-colors hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      }
    >
      {sentMessage ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-card border border-success bg-success-surface p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="font-mono text-mono-body text-text-primary">{sentMessage}</p>
          </div>
          <Link href="/login" className="block">
            <Button type="button" variant="secondary" fullWidth>
              Voltar para o login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="jogador@clipai.com.br"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            loadingText="ENVIANDO LINK..."
          >
            ENVIAR LINK DE RECUPERAÇÃO
          </Button>
        </form>
      )}
    </AuthCardLayout>
  );
}
