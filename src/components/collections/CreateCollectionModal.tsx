'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { PrivacySelector } from '@/components/upload/PrivacySelector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { collectionsService } from '@/services/collections-service';
import type { Collection, PrivacyLevel } from '@/types/collection';

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
  const { success, error: showErrorToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [accentColor, setAccentColor] = useState<string>(ACCENT_COLOR_OPTIONS[0].hex);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(initialCollection);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialCollection?.title ?? '');
    setDescription(initialCollection?.description ?? '');
    setPrivacy(initialCollection?.privacy ?? 'public');
    setAccentColor(initialCollection?.accent_color ?? ACCENT_COLOR_OPTIONS[0].hex);
    setTitleError(null);
  }, [isOpen, initialCollection]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
              accent_color: accentColor,
            })
          : await collectionsService.createCollection({
              title: trimmedTitle,
              description: description.trim() || null,
              privacy,
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 text-text-primary shadow-2xl">
        <header className="mb-5 flex items-center justify-between border-b border-border-muted pb-3.5">
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

          <PrivacySelector value={privacy} onChange={setPrivacy} disabled={isSaving} />

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
  );
}
