'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookmarkPlus, Check, FolderPlus, Loader2, X } from 'lucide-react';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { collectionsService } from '@/services/collections-service';
import type { Collection } from '@/types/collection';

export interface AddToCollectionModalProps {
  clipId: string;
  clipTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onMembershipChanged?: () => void;
}

export function AddToCollectionModal({
  clipId,
  clipTitle,
  isOpen,
  onClose,
  onMembershipChanged,
}: Readonly<AddToCollectionModalProps>) {
  const { success, error: showErrorToast } = useToast();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberCollectionIds, setMemberCollectionIds] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await collectionsService.listCollections({ mine: true, page_size: 50 });
      setCollections(response.items);

      const details = await Promise.all(
        response.items.map((col) =>
          collectionsService.getCollection(col.id, { page_size: 50 }).catch(() => null),
        ),
      );

      const nextMembers = new Set<string>();
      for (const detail of details) {
        if (detail?.clips.some((item) => item.clip.id === clipId)) {
          nextMembers.add(detail.id);
        }
      }
      setMemberCollectionIds(nextMembers);
    } catch {
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, [clipId]);

  useEffect(() => {
    if (isOpen) {
      void loadCollections();
    }
  }, [isOpen, loadCollections]);

  if (!isOpen) {
    return null;
  }

  const handleToggleCollection = async (collection: Collection) => {
    if (pendingId) return;

    const isMember = memberCollectionIds.has(collection.id);
    setPendingId(collection.id);

    try {
      if (isMember) {
        await collectionsService.removeClipFromCollection(collection.id, clipId);
        setMemberCollectionIds((prev) => {
          const next = new Set(prev);
          next.delete(collection.id);
          return next;
        });
        setCollections((prev) =>
          prev.map((item) =>
            item.id === collection.id
              ? { ...item, clips_count: Math.max(0, item.clips_count - 1) }
              : item,
          ),
        );
        success(`Removido da coleção "${collection.title}".`);
      } else {
        await collectionsService.addClipToCollection(collection.id, clipId);
        setMemberCollectionIds((prev) => new Set(prev).add(collection.id));
        setCollections((prev) =>
          prev.map((item) =>
            item.id === collection.id ? { ...item, clips_count: item.clips_count + 1 } : item,
          ),
        );
        success(`Salvo na coleção "${collection.title}"!`);
      }
      onMembershipChanged?.();
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível atualizar a coleção. Tente novamente.';
      showErrorToast(message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <dialog
        open
        aria-modal="true"
        aria-labelledby="add-to-collection-title"
        className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-bg-deep/85 p-4 text-text-primary backdrop-blur-sm"
      >
        <div className="w-full max-w-md rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 text-text-primary shadow-2xl">
          <header className="mb-4 flex items-center justify-between border-b border-border-muted pb-3.5">
            <div className="flex items-center gap-2.5">
              <BookmarkPlus className="h-5 w-5 text-success" aria-hidden="true" />
              <div>
                <h2
                  id="add-to-collection-title"
                  className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
                >
                  SALVAR EM COLEÇÃO
                </h2>
                <p className="line-clamp-1 font-mono text-mono-badge text-text-secondary">
                  {clipTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal de salvar em coleção"
              className="rounded-control p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 font-mono text-mono-meta text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-success" aria-hidden="true" />
              <span>Carregando suas coleções...</span>
            </div>
          ) : collections.length === 0 ? (
            <div className="space-y-3 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep p-5 text-center">
              <p className="font-mono text-mono-meta text-text-secondary">
                Você ainda não criou nenhuma coleção.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<FolderPlus className="h-4 w-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                CRIAR PRIMEIRA COLEÇÃO
              </Button>
            </div>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {collections.map((collection) => {
                const checked = memberCollectionIds.has(collection.id);
                const isRowPending = pendingId === collection.id;

                return (
                  <li key={collection.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-border-muted bg-bg-deep px-3.5 py-2.5 transition-colors hover:border-success">
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={Boolean(pendingId)}
                          onChange={() => void handleToggleCollection(collection)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-control border transition-colors ${
                            checked
                              ? 'border-success bg-success text-bg-deep'
                              : 'border-border-muted bg-bg-elevated text-transparent'
                          }`}
                        >
                          {isRowPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-text-primary" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-mono-body font-semibold text-text-primary">
                            {collection.title}
                          </span>
                          <span className="block font-mono text-mono-badge text-text-muted">
                            {collection.clips_count}{' '}
                            {collection.clips_count === 1 ? 'clipe' : 'clipes'}
                          </span>
                        </span>
                      </span>

                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: collection.accent_color || '#2EB886' }}
                        aria-hidden="true"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-muted pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<FolderPlus className="h-4 w-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Nova coleção
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Concluir
            </Button>
          </div>
        </div>
      </dialog>

      <CreateCollectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSaved={(newCollection) => {
          setCollections((prev) => [newCollection, ...prev]);
          onMembershipChanged?.();
        }}
      />
    </>
  );
}
