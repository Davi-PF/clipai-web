'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { AlertTriangle, FolderPlus, Lock, X } from 'lucide-react';
import { CollectionPrivacySelector } from '@/components/collections/CollectionPrivacySelector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import {
  getCollectionVisibilityLabel,
  isGlobalVisibilityMoreRestrictive,
  normalizeCollectionVisibility,
} from '@/lib/collection-privacy';
import { collectionsService } from '@/services/collections-service';
import type { Collection, CollectionVisibility } from '@/types/collection';

const ACCENT_COLOR_OPTIONS = [
  { hex: '#2EB886', label: 'Verde Esmeralda' },
  { hex: '#E8B04B', label: 'Amarelo Destaque' },
  { hex: '#D93848', label: 'Vermelho REC' },
  { hex: '#4F6478', label: 'Azul Aço' },
] as const;

export interface CreateCollectionModalProps {
  isOpen: boolean;
  initialCollection?: Collection | null;
  onClose: () => void;
  onSaved: (collection: Collection) => void;
}

export function CreateCollectionModal({
  isOpen,
  initialCollection = null,
  onClose,
  onSaved,
}: Readonly<CreateCollectionModalProps>) {
  const { user } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<CollectionVisibility>('public');
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [accentColor, setAccentColor] = useState<string>(ACCENT_COLOR_OPTIONS[0].hex);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(initialCollection);
  const globalVisibility = normalizeCollectionVisibility(user?.collections_visibility);
  const profileUsername = user?.username || 'seu-usuario';
  const showCeilingWarning =
    showOnProfile && isGlobalVisibilityMoreRestrictive(globalVisibility, privacy);
  const showPrivateOwnerHint = showOnProfile && !showCeilingWarning && privacy === 'private';

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialCollection?.title ?? '');
    setDescription(initialCollection?.description ?? '');
    setPrivacy(normalizeCollectionVisibility(initialCollection?.privacy));
    setShowOnProfile(Boolean(initialCollection?.show_on_profile));
    setAccentColor(initialCollection?.accent_color ?? ACCENT_COLOR_OPTIONS[0].hex);
    setTitleError(null);
  }, [isOpen, initialCollection]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 80) {
      setTitleError('Informe um nome entre 2 e 80 caracteres.');
      return;
    }

    setTitleError(null);
    setIsSaving(true);

    try {
      const saved =
        isEditMode && initialCollection
          ? await collectionsService.updateCollection(initialCollection.id, {
              title: trimmedTitle,
              description: description.trim() || null,
              privacy,
              show_on_profile: showOnProfile,
              accent_color: accentColor,
            })
          : await collectionsService.createCollection({
              title: trimmedTitle,
              description: description.trim() || null,
              privacy,
              show_on_profile: showOnProfile,
              accent_color: accentColor,
            });

      success(isEditMode ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!');
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar a coleção. Tente novamente.';
      showErrorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="collection-modal-title"
      className="fixed inset-0 z-50 !m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 text-text-primary backdrop-blur-sm"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-bento border-[1.5px] border-border-muted bg-bg-surface text-text-primary shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border-muted px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <FolderPlus className="h-4 w-4 text-success" aria-hidden="true" />
            </div>
            <h2
              id="collection-modal-title"
              className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary"
            >
              {isEditMode ? 'EDITAR COLEÇÃO' : 'NOVA COLEÇÃO'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de coleção"
            className="rounded-control p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
            <Input
              label="Nome da coleção"
              name="collection_title"
              placeholder="Ex: Melhores Clutches de CS2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={titleError}
              disabled={isSaving}
            />

            <div className="space-y-1.5">
              <label
                htmlFor="collection-description"
                className="block font-mono text-mono-meta font-medium text-text-secondary"
              >
                Descrição (opcional)
              </label>
              <textarea
                id="collection-description"
                rows={3}
                value={description}
                disabled={isSaving}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva o tema dos clipes desta coleção..."
                className="w-full rounded-control border border-border-muted bg-bg-elevated p-3 font-mono text-mono-body text-text-primary placeholder:text-text-muted focus:border-success focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <fieldset className="space-y-2" disabled={isSaving}>
              <legend className="font-mono text-mono-meta font-medium text-text-secondary">
                Cor de destaque
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_COLOR_OPTIONS.map((option) => {
                  const isSelected = accentColor.toUpperCase() === option.hex.toUpperCase();
                  return (
                    <button
                      key={option.hex}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={isSelected}
                      onClick={() => setAccentColor(option.hex)}
                      className={`flex items-center gap-2 rounded-control border px-3 py-1.5 font-mono text-mono-badge transition-colors ${
                        isSelected
                          ? 'border-text-primary bg-bg-deep text-text-primary'
                          : 'border-border-muted bg-bg-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-bg-deep"
                        style={{ backgroundColor: option.hex }}
                        aria-hidden="true"
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <CollectionPrivacySelector value={privacy} onChange={setPrivacy} disabled={isSaving} />

            {/* Toggle Exibir no Perfil Público */}
            <div className="rounded-card border border-border-muted bg-bg-deep p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <span
                    id="show-on-profile-label"
                    className="block font-mono text-mono-body font-semibold text-text-primary"
                  >
                    Exibir no meu perfil público
                  </span>
                  <p
                    id="show-on-profile-desc"
                    className="font-mono text-mono-badge text-text-secondary"
                  >
                    Mostra esta coleção na aba Coleções do seu perfil{' '}
                    <span className="text-text-primary">/u/{profileUsername}</span>.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={showOnProfile}
                  aria-labelledby="show-on-profile-label"
                  aria-describedby="show-on-profile-desc"
                  disabled={isSaving}
                  onClick={() => setShowOnProfile((prev) => !prev)}
                  className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success disabled:cursor-not-allowed disabled:opacity-60 ${
                    showOnProfile
                      ? 'border-success bg-success'
                      : 'border-border-muted bg-bg-elevated'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-4 w-4 rounded-full transition-transform ${
                      showOnProfile ? 'translate-x-5 bg-bg-deep' : 'translate-x-1 bg-text-secondary'
                    }`}
                  />
                </button>
              </div>
            </div>

            {showCeilingWarning && (
              <div
                role="status"
                data-testid="collection-ceiling-warning"
                className="flex items-start gap-2.5 rounded-card border border-warning bg-bg-deep p-3.5 font-mono text-mono-meta text-text-primary"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <p className="min-w-0 text-text-secondary">
                  Seu perfil global limita coleções a &apos;
                  <span className="font-semibold text-text-primary">
                    {getCollectionVisibilityLabel(globalVisibility)}
                  </span>
                  &apos;. Ajuste em{' '}
                  <Link
                    href="/settings?tab=privacy"
                    onClick={onClose}
                    className="font-semibold text-warning underline underline-offset-2 transition-colors hover:text-text-primary"
                  >
                    Configurações &gt; Privacidade
                  </Link>{' '}
                  para ampliar a visibilidade.
                </p>
              </div>
            )}

            {showPrivateOwnerHint && (
              <div
                role="note"
                data-testid="collection-private-profile-hint"
                className="flex items-start gap-2.5 rounded-card border border-border-muted bg-bg-deep p-3 font-mono text-mono-badge text-text-secondary"
              >
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <p>
                  Como esta coleção está em &apos;Somente Eu&apos;, ela aparecerá na aba Coleções do
                  seu perfil apenas para você.
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                loadingText={isEditMode ? 'SALVANDO...' : 'CRIANDO...'}
              >
                {isEditMode ? 'SALVAR ALTERAÇÕES' : 'CRIAR COLEÇÃO'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
