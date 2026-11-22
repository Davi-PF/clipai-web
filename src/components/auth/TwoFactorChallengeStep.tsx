'use client';

import { useState, type FormEvent } from 'react';
import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { validateTwoFactorCode } from '@/lib/validators';

export interface TwoFactorChallengeStepProps {
  challengeToken: string;
  userEmail?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TwoFactorChallengeStep({
  challengeToken,
  userEmail,
  onSuccess,
  onCancel,
}: Readonly<TwoFactorChallengeStepProps>) {
  const { verify2faLogin } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleMode = () => {
    setUseBackupCode((prev) => !prev);
    setCode('');
    setCodeError(null);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateTwoFactorCode(code, useBackupCode);
    if (!validation.valid) {
      setCodeError(validation.errorMessage);
      return;
    }

    setIsSubmitting(true);
    setCodeError(null);
    setFormError(null);

    try {
      await verify2faLogin({
        challenge_token: challengeToken,
        code: code.trim(),
      });
      success('Verificação em duas etapas concluída! Bem-vindo de volta.');
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Código de verificação 2FA ou código de backup inválido.';
      setFormError(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="two-factor-challenge-step" className="space-y-4">
      <div className="flex items-start gap-3 rounded-card border border-border-muted bg-bg-deep p-3.5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div className="space-y-1 font-mono text-mono-meta text-text-secondary">
          <p className="font-semibold text-text-primary">Verificação em 2 Etapas (2FA)</p>
          <p>
            {useBackupCode
              ? 'Digite um dos seus códigos de backup de uso único (ex.: 7K4M-9P2X).'
              : 'Abra seu aplicativo autenticador (Google Authenticator, Authy, 1Password) e digite o código de 6 dígitos.'}
          </p>
          {userEmail && <p className="text-mono-badge text-text-muted">Conta: {userEmail}</p>}
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label={useBackupCode ? 'Código de backup' : 'Código de 6 dígitos'}
          type="text"
          name="two_factor_code"
          inputMode={useBackupCode ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          maxLength={useBackupCode ? 16 : 6}
          placeholder={useBackupCode ? '7K4M-9P2X' : '000000'}
          value={code}
          onChange={(event) => {
            const raw = event.target.value;
            setCode(useBackupCode ? raw.toUpperCase() : raw.replace(/\D/g, '').slice(0, 6));
          }}
          error={codeError}
          leftIcon={<KeyRound className="h-4 w-4" />}
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          loadingText="VERIFICANDO CÓDIGO..."
        >
          CONFIRMAR VERIFICAÇÃO
        </Button>

        <div className="flex flex-col items-center justify-between gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            onClick={handleToggleMode}
            disabled={isSubmitting}
            className="font-mono text-mono-meta text-success transition-colors hover:underline"
          >
            {useBackupCode ? 'Usar código do autenticador' : 'Usar código de backup'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="font-mono text-mono-meta text-text-secondary transition-colors hover:text-text-primary"
            >
              Voltar para o login
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
