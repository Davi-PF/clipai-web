'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Lock,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { validateTwoFactorCode } from '@/lib/validators';
import type { TwoFactorSetupResponse, User } from '@/types/api';

interface BackupCodesStepProps {
  backupCodes: string[];
  username: string;
  onFinish: () => void;
}

function BackupCodesStep({ backupCodes, username, onFinish }: Readonly<BackupCodesStepProps>) {
  const { success, error: showErrorToast } = useToast();
  const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      success('Códigos de backup copiados para a área de transferência!');
    } catch {
      showErrorToast('Não foi possível copiar os códigos automaticamente.');
    }
  };

  const handleDownloadTxt = () => {
    const content = [
      'CLIPAÍ — CÓDIGOS DE BACKUP 2FA (USO ÚNICO)',
      `Conta: @${username}`,
      'Guarde estes códigos em local seguro. Cada código só pode ser utilizado uma vez.',
      '',
      ...backupCodes,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `clipai-backup-codes-${username}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
    success('Arquivo .TXT com códigos de backup baixado!');
  };

  return (
    <div data-testid="two-factor-step-backup-codes" className="mt-5 space-y-5">
      <div className="flex items-start gap-3 rounded-card border-[1.5px] border-warning bg-bg-deep p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-1 font-mono text-mono-meta text-text-primary">
          <p className="font-semibold text-warning">PASSO 3 DE 3 — GUARDE SEUS CÓDIGOS DE BACKUP</p>
          <p className="text-text-secondary">
            Estes 8 códigos de uso único são exibidos apenas agora. Caso perca acesso ao seu
            aplicativo autenticador, cada código abaixo permite entrar uma única vez na sua conta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 rounded-card border border-border-muted bg-bg-deep p-4 sm:grid-cols-4">
        {backupCodes.map((backupCode) => (
          <code
            key={backupCode}
            data-testid="backup-code-item"
            className="rounded-control border border-border-muted bg-bg-surface px-3 py-2 text-center font-mono text-mono-body font-bold tracking-wider text-text-primary"
          >
            {backupCode}
          </code>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Copy className="h-4 w-4" />}
          onClick={() => void handleCopyCodes()}
        >
          COPIAR CÓDIGOS
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={handleDownloadTxt}
        >
          BAIXAR .TXT
        </Button>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-card border border-border-muted bg-bg-deep p-3.5 font-mono text-mono-meta text-text-primary">
        <input
          type="checkbox"
          checked={hasConfirmedSaved}
          onChange={(event) => setHasConfirmedSaved(event.target.checked)}
          className="h-4 w-4 rounded border-border-muted bg-bg-elevated accent-success"
        />
        <span>Confirmo que salvei meus códigos de backup em um local seguro.</span>
      </label>

      <div className="flex justify-end">
        <Button type="button" variant="primary" disabled={!hasConfirmedSaved} onClick={onFinish}>
          CONCLUIR ATIVAÇÃO
        </Button>
      </div>
    </div>
  );
}

interface DisableTwoFactorModalProps {
  isOpen: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

function DisableTwoFactorModal({
  isOpen,
  hasPassword,
  onClose,
  onDisabled,
}: Readonly<DisableTwoFactorModalProps>) {
  const { disable2fa } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCodeError(null);
    setPasswordError(null);
    setFormError(null);

    const trimmedCode = code.trim();
    if (trimmedCode.length < 6) {
      setCodeError('Informe o código de 6 dígitos do autenticador ou um código de backup.');
      return;
    }

    if (hasPassword && !password) {
      setPasswordError('Informe sua senha atual para confirmar a desativação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await disable2fa({
        code: trimmedCode,
        password: hasPassword ? password : null,
      });
      success(response.message);
      setCode('');
      setPassword('');
      onDisabled();
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível desativar a autenticação em duas etapas.';
      setFormError(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disable-2fa-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-4"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between border-b border-border-muted pb-4">
          <h3
            id="disable-2fa-dialog-title"
            className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
          >
            DESATIVAR 2FA AUTHENTICATOR
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de desativação 2FA"
            className="rounded-control p-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} noValidate className="mt-4 space-y-4">
          <p className="font-mono text-mono-meta text-text-secondary">
            Para remover a proteção em duas etapas e invalidar seus códigos de backup atuais,
            confirme sua identidade abaixo.
          </p>

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Código 2FA ou código de backup"
            type="text"
            name="disable_2fa_code"
            placeholder="000000 ou 7K4M-9P2X"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={codeError}
            leftIcon={<KeyRound className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          {hasPassword && (
            <Input
              label="Senha atual"
              type="password"
              name="disable_2fa_password"
              placeholder="Digite sua senha atual"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordError}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isSubmitting}
            />
          )}

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isSubmitting}
              loadingText="DESATIVANDO..."
            >
              CONFIRMAR DESATIVAÇÃO
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface SecurityTwoFactorTabProps {
  user: User;
}

export function SecurityTwoFactorTab({ user }: Readonly<SecurityTwoFactorTabProps>) {
  const { setup2fa, enable2fa } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  const is2faEnabled = Boolean(user.is_2fa_enabled);
  const hasPassword = user.has_password !== false;

  const handleStartSetup = async () => {
    setIsStartingSetup(true);
    setSetupError(null);
    setCodeError(null);
    try {
      const response = await setup2fa();
      setSetupData(response);
      setBackupCodes(null);
      setVerificationCode('');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível iniciar a configuração do 2FA.';
      setSetupError(message);
      showErrorToast(message);
    } finally {
      setIsStartingSetup(false);
    }
  };

  const handleCopySecret = async () => {
    const secret = setupData?.manual_secret || setupData?.secret;
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      success('Chave secreta copiada para a área de transferência!');
    } catch {
      showErrorToast('Não foi possível copiar a chave secreta.');
    }
  };

  const handleEnableSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateTwoFactorCode(verificationCode, false);
    if (!validation.valid) {
      setCodeError(validation.errorMessage);
      return;
    }

    setIsEnabling(true);
    setCodeError(null);
    setSetupError(null);

    try {
      const response = await enable2fa({ code: verificationCode.trim() });
      setBackupCodes(response.backup_codes);
      setSetupData(null);
      setVerificationCode('');
      success(response.message);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Código de verificação 2FA inválido. Verifique o código no aplicativo.';
      setCodeError(message);
      showErrorToast(message);
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div data-testid="settings-tab-security" className="space-y-6">
      <section className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border-muted pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              {is2faEnabled ? (
                <ShieldCheck className="h-6 w-6 text-success" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-warning" aria-hidden="true" />
              )}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                  AUTENTICAÇÃO EM DUAS ETAPAS (2FA)
                </h2>
                {is2faEnabled ? (
                  <span
                    data-testid="two-factor-status-badge"
                    className="inline-flex items-center gap-1.5 rounded-control border border-success bg-success-surface px-2.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-success"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    ATIVADO
                  </span>
                ) : (
                  <span
                    data-testid="two-factor-status-badge"
                    className="inline-flex items-center gap-1.5 rounded-control border border-warning bg-bg-deep px-2.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-warning"
                  >
                    DESATIVADO
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-mono-meta text-text-secondary">
                Proteja sua conta com códigos TOTP temporários gerados no Google Authenticator,
                Authy ou 1Password.
              </p>
            </div>
          </div>
        </div>

        {setupError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{setupError}</span>
          </div>
        )}

        {/* Passo 3: Exibição única dos códigos de backup recém-gerados */}
        {backupCodes && (
          <BackupCodesStep
            backupCodes={backupCodes}
            username={user.username}
            onFinish={() => setBackupCodes(null)}
          />
        )}

        {/* Estado Ativo (2FA já configurado e fora do wizard de backup codes) */}
        {!backupCodes && is2faEnabled && (
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-deep p-4 sm:flex-row sm:items-center">
            <div className="space-y-1 font-mono text-mono-meta text-text-secondary">
              <p className="font-semibold text-text-primary">
                Sua conta está protegida com verificação em duas etapas (TOTP).
              </p>
              <p>
                A cada novo login, solicitaremos o código de 6 dígitos do seu aplicativo
                autenticador ou um código de backup.
              </p>
            </div>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsDisableModalOpen(true)}
            >
              DESATIVAR 2FA
            </Button>
          </div>
        )}

        {/* Estado Inativo Inicial (antes de iniciar o wizard) */}
        {!backupCodes && !is2faEnabled && !setupData && (
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-card border border-border-muted bg-bg-deep p-4 sm:flex-row sm:items-center">
            <p className="font-mono text-mono-meta text-text-secondary">
              Adicione uma camada extra de segurança para impedir acessos não autorizados mesmo que
              sua senha seja exposta.
            </p>

            <Button
              type="button"
              variant="primary"
              leftIcon={<QrCode className="h-4 w-4" />}
              isLoading={isStartingSetup}
              loadingText="GERANDO CHAVE..."
              onClick={() => void handleStartSetup()}
            >
              CONFIGURAR 2FA
            </Button>
          </div>
        )}

        {/* Passos 1 e 2: Escanear QR Code Local + Confirmar Código de 6 dígitos */}
        {!backupCodes && !is2faEnabled && setupData && (
          <div data-testid="two-factor-setup-wizard" className="mt-5 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Passo 1: QR Code Local + Chave Secreta */}
              <div className="space-y-4 rounded-card border border-border-muted bg-bg-deep p-5">
                <div className="space-y-1">
                  <span className="font-mono text-mono-badge font-bold uppercase text-success">
                    PASSO 1 DE 3
                  </span>
                  <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                    ESCANEAR QR CODE NO AUTENTICADOR
                  </h3>
                  <p className="font-mono text-mono-meta text-text-secondary">
                    Escaneie o QR Code abaixo com a câmera do seu aplicativo autenticador ou copie a
                    chave secreta manualmente.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-4">
                  <div
                    data-testid="local-2fa-qrcode"
                    className="inline-flex shrink-0 items-center justify-center self-center rounded-card border border-border-muted bg-text-primary p-3.5 sm:self-start"
                  >
                    <QRCodeSVG
                      value={setupData.otpauth_uri}
                      size={156}
                      bgColor="#B7C7D6"
                      fgColor="#061C2C"
                      level="M"
                    />
                  </div>

                  <div className="w-full min-w-0 space-y-2.5">
                    <span className="block font-mono text-mono-badge uppercase text-text-muted">
                      CHAVE SECRETA MANUAL (BASE32)
                    </span>
                    <code
                      data-testid="manual-2fa-secret"
                      className="block w-full break-all rounded-control border border-border-muted bg-bg-surface px-3 py-2 font-mono text-mono-body font-semibold text-text-primary"
                    >
                      {setupData.manual_secret || setupData.secret}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() => void handleCopySecret()}
                    >
                      Copiar chave secreta
                    </Button>
                  </div>
                </div>
              </div>

              {/* Passo 2: Digitar Código de 6 Dígitos */}
              <div className="flex flex-col justify-between rounded-card border border-border-muted bg-bg-deep p-5">
                <div className="space-y-1">
                  <span className="font-mono text-mono-badge font-bold uppercase text-success">
                    PASSO 2 DE 3
                  </span>
                  <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                    CONFIRMAR CÓDIGO DE 6 DÍGITOS
                  </h3>
                  <p className="font-mono text-mono-meta text-text-secondary">
                    Digite o código numérico de 6 dígitos exibido no seu aplicativo para ativar o
                    2FA e gerar seus códigos de backup.
                  </p>
                </div>

                <form
                  onSubmit={(event) => void handleEnableSubmit(event)}
                  noValidate
                  className="mt-4 space-y-4"
                >
                  <Input
                    label="Código de 6 dígitos"
                    type="text"
                    name="totp_code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    error={codeError}
                    leftIcon={<KeyRound className="h-4 w-4" />}
                    disabled={isEnabling}
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isEnabling}
                      onClick={() => {
                        setSetupData(null);
                        setVerificationCode('');
                        setCodeError(null);
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isEnabling}
                      loadingText="ATIVANDO 2FA..."
                    >
                      ATIVAR 2FA
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>

      <DisableTwoFactorModal
        isOpen={isDisableModalOpen}
        hasPassword={hasPassword}
        onClose={() => setIsDisableModalOpen(false)}
        onDisabled={() => setIsDisableModalOpen(false)}
      />
    </div>
  );
}
