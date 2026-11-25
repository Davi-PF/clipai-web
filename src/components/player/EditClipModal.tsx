'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import { X } from 'lucide-react';
import { PrivacySelector } from '@/components/upload/PrivacySelector';
import { TagsChipInput } from '@/components/upload/TagsChipInput';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { validateClipDescription, validateClipTitle } from '@/lib/validators';
import { clipsService } from '@/services/clips-service';
import type { Clip, Game, PrivacyLevel } from '@/types/clip';

export interface EditClipModalProps {
  clip: Clip;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedClip: Clip) => void;
}

export function EditClipModal({ clip, isOpen, onClose, onUpdated }: Readonly<EditClipModalProps>) {
  const { success, error: showErrorToast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [title, setTitle] = useState(clip.title);
  const [description, setDescription] = useState(clip.description ?? '');
  const [gameId, setGameId] = useState(clip.game.id);
  const [tags, setTags] = useState<string[]>(clip.tags);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(clip.privacy);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(clip.title);
    setDescription(clip.description ?? '');
    setGameId(clip.game.id);
    setTags(clip.tags);
    setPrivacy(clip.privacy);
    setTitleError(null);
    setDescError(null);

    let isActive = true;
    void clipsService
      .listGames({ page_size: 50 })
      .then((res) => {
        if (isActive) setGames(res.items);
      })
      .catch(() => {
        if (isActive) setGames([clip.game]);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, clip]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const titleCheck = validateClipTitle(title);
    const descCheck = validateClipDescription(description);

    setTitleError(titleCheck.valid ? null : titleCheck.errorMessage);
    setDescError(descCheck.valid ? null : descCheck.errorMessage);

    if (!titleCheck.valid || !descCheck.valid) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = await clipsService.updateClip(clip.id, {
        title: title.trim(),
        description: description.trim() || null,
        game_id: gameId,
        privacy,
        tags,
      });
      success('Clipe atualizado com sucesso!');
      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError ? err.message : 'Não foi possível salvar as alterações.';
      showErrorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="edit-clip-modal-title"
      className="fixed inset-0 z-50 !m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 text-text-primary backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 text-text-primary shadow-2xl">
        <header className="mb-5 flex items-center justify-between border-b border-border-muted pb-3">
          <h2
            id="edit-clip-modal-title"
            className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary"
          >
            EDITAR CLIPE
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de edição"
            className="rounded-control p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
          <Input
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={titleError}
            disabled={isSaving}
          />

          <div className="space-y-1.5">
            <label
              htmlFor="edit-clip-description"
              className="block font-mono text-mono-meta font-medium text-text-secondary"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="edit-clip-description"
              rows={3}
              value={description}
              disabled={isSaving}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-control border border-border-muted bg-bg-elevated p-3 font-mono text-mono-body text-text-primary focus:border-success focus:outline-none"
            />
            {descError && (
              <p role="alert" className="font-mono text-mono-meta text-danger-text">
                {descError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-clip-game"
              className="block font-mono text-mono-meta font-medium text-text-secondary"
            >
              Jogo
            </label>
            <select
              id="edit-clip-game"
              value={gameId}
              disabled={isSaving}
              onChange={(event) => setGameId(event.target.value)}
              className="h-11 w-full rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-body text-text-primary focus:border-success focus:outline-none"
            >
              {games.length === 0 && <option value={clip.game.id}>{clip.game.name}</option>}
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          <TagsChipInput tags={tags} onChange={setTags} disabled={isSaving} />

          <PrivacySelector value={privacy} onChange={setPrivacy} disabled={isSaving} />

          <div className="flex flex-col-reverse gap-3 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} loadingText="SALVANDO...">
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
