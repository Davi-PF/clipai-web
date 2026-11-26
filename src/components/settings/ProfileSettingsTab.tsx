'use client';

import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import Link from 'next/link';
import { AlertTriangle, Camera, ExternalLink, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DiscordIcon } from '@/components/ui/DiscordBadge';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { R2UploadError } from '@/lib/r2-upload';
import {
  MAX_BIO_LENGTH,
  validateAvatarFileMeta,
  validateBio,
  validateDisplayName,
} from '@/lib/validators';
import { userService } from '@/services/user-service';
import type { User } from '@/types/api';

export interface ProfileSettingsTabProps {
  user: User;
  onUserUpdated: (nextUser: User) => void;
}

export function ProfileSettingsTab({ user, onUserUpdated }: Readonly<ProfileSettingsTabProps>) {
  const { success, error: showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(user.display_name || user.username);
  const [bio, setBio] = useState(user.bio ?? '');

  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isApplyingDiscordAvatar, setIsApplyingDiscordAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setDisplayName(user.display_name || user.username);
    setBio(user.bio ?? '');
  }, [user.display_name, user.username, user.bio]);

  useEffect(() => {
    return () => {
      if (localAvatarPreview) {
        URL.revokeObjectURL(localAvatarPreview);
      }
    };
  }, [localAvatarPreview]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const validation = validateAvatarFileMeta(file);
    if (!validation.valid) {
      setAvatarError(validation.errorMessage);
      if (validation.errorMessage) {
        showErrorToast(validation.errorMessage);
      }
      return;
    }

    setAvatarError(null);
    if (localAvatarPreview) {
      URL.revokeObjectURL(localAvatarPreview);
    }
    const nextPreview = URL.createObjectURL(file);
    setLocalAvatarPreview(nextPreview);
    setIsUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const updatedUser = await userService.uploadAvatar(file, (percent) => {
        setUploadProgress(percent);
      });
      onUserUpdated(updatedUser);
      setLocalAvatarPreview(null);
      URL.revokeObjectURL(nextPreview);
      success('Foto de perfil atualizada com sucesso!');
    } catch (err: unknown) {
      setLocalAvatarPreview(null);
      URL.revokeObjectURL(nextPreview);
      const message =
        err instanceof ApiClientError || err instanceof R2UploadError
          ? err.message
          : 'Não foi possível enviar sua foto de perfil.';
      setAvatarError(message);
      showErrorToast(message);
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(null);
    }
  };

  const handleUseDiscordAvatar = async () => {
    setIsApplyingDiscordAvatar(true);
    setAvatarError(null);
    try {
      const updatedUser = await userService.useDiscordAvatar();
      onUserUpdated(updatedUser);
      success('Avatar do Discord aplicado ao seu perfil!');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível aplicar o avatar do Discord.';
      setAvatarError(message);
      showErrorToast(message);
    } finally {
      setIsApplyingDiscordAvatar(false);
    }
  };

  const handleSubmitProfile = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nameValidation = validateDisplayName(displayName);
    const bioValidation = validateBio(bio);

    setDisplayNameError(nameValidation.valid ? null : nameValidation.errorMessage);
    setBioError(bioValidation.valid ? null : bioValidation.errorMessage);
    setFormError(null);

    if (!nameValidation.valid || !bioValidation.valid) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await userService.updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
      });
      onUserUpdated(updatedUser);
      success('Alterações do perfil salvas com sucesso!');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar as alterações do perfil.';
      setFormError(message);
      showErrorToast(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div data-testid="settings-tab-profile" className="space-y-6">
      {/* Seção de Avatar */}
      <section className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border-muted pb-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-display-md uppercase leading-none text-text-primary">
              FOTO DE PERFIL
            </h2>
            <p className="mt-1.5 font-mono text-mono-meta text-text-secondary">
              Envie uma imagem personalizada (.JPG, .PNG ou .WEBP até 5 MB) ou use seu avatar do
              Discord.
            </p>
          </div>

          <Link
            href={`/u/${user.username}`}
            className="inline-flex h-8 max-w-full min-w-0 shrink-0 items-center gap-1.5 self-start rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-badge leading-none text-text-primary transition-colors hover:border-success sm:self-center"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            <span className="truncate">Ver perfil público (@{user.username})</span>
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar
            username={user.username}
            displayName={displayName || user.display_name}
            avatarUrl={localAvatarPreview ?? user.avatar_url}
            size="xl"
          />

          <div className="flex-1 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Selecionar foto de perfil"
              data-testid="avatar-file-input"
              onChange={(event) => void handleFileChange(event)}
              disabled={isUploadingAvatar}
              className="sr-only"
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Camera className="h-4 w-4" />}
                isLoading={isUploadingAvatar}
                loadingText="Enviando foto..."
                onClick={() => fileInputRef.current?.click()}
              >
                Enviar nova foto
              </Button>

              {user.discord_linked && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<DiscordIcon className="h-4 w-4 text-success" />}
                  isLoading={isApplyingDiscordAvatar}
                  loadingText="Aplicando..."
                  disabled={isUploadingAvatar || user.avatar_source === 'discord'}
                  onClick={() => void handleUseDiscordAvatar()}
                >
                  Usar avatar do Discord
                </Button>
              )}
            </div>

            {isUploadingAvatar && uploadProgress !== null && (
              <div
                data-testid="avatar-upload-progress"
                className="max-w-sm space-y-1.5 rounded-card border border-border-muted bg-bg-deep p-3"
              >
                <div className="flex items-center justify-between font-mono text-mono-badge text-text-secondary">
                  <span>Enviando para o Cloudflare R2...</span>
                  <span className="font-semibold text-success">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface">
                  <div
                    style={{ width: `${uploadProgress}%` }}
                    className="h-full bg-success transition-all duration-150"
                  />
                </div>
              </div>
            )}

            {avatarError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{avatarError}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Formulário de Informações do Perfil */}
      <section className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 sm:p-6">
        <header className="mb-5 border-b border-border-muted pb-4">
          <h2 className="font-display text-display-md uppercase leading-none text-text-primary">
            INFORMAÇÕES PÚBLICAS
          </h2>
          <p className="mt-1.5 font-mono text-mono-meta text-text-secondary">
            Personalize como seu perfil é exibido nos seus clipes e coleções.
          </p>
        </header>

        <form
          onSubmit={(event) => void handleSubmitProfile(event)}
          noValidate
          className="space-y-4"
        >
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome de usuário (username)"
              type="text"
              value={`@${user.username}`}
              disabled
              hint="Identificador único do seu perfil público."
            />

            <Input
              label="Nome de exibição"
              type="text"
              name="display_name"
              placeholder="Seu nick ou nome de jogador"
              maxLength={50}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              error={displayNameError}
              leftIcon={<UserIcon className="h-4 w-4" />}
              disabled={isSavingProfile}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="profile-bio-textarea"
                className="font-mono text-mono-meta font-medium text-text-secondary"
              >
                Bio
              </label>
              <span
                data-testid="bio-char-counter"
                className={`inline-flex items-center font-mono text-mono-badge leading-none ${
                  bio.length > MAX_BIO_LENGTH ? 'text-danger-text' : 'text-text-muted'
                }`}
              >
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>

            <textarea
              id="profile-bio-textarea"
              name="bio"
              rows={3}
              maxLength={MAX_BIO_LENGTH}
              placeholder="Conte sobre seus jogos favoritos, função no time ou setup..."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              disabled={isSavingProfile}
              className={`w-full rounded-control border bg-bg-elevated p-3 font-mono text-mono-body text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60 ${
                bioError
                  ? 'border-danger focus:border-danger'
                  : 'border-border-muted focus:border-success'
              }`}
            />

            {bioError && (
              <p role="alert" className="font-mono text-mono-meta text-danger-text">
                {bioError}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingProfile}
              loadingText="SALVANDO..."
            >
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
