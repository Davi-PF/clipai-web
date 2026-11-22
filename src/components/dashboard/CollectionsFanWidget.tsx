'use client';

import { useEffect, useState } from 'react';
import { FolderKanban, Globe, Link2, Plus, Users } from 'lucide-react';
import type { Collection, PrivacyLevel } from '@/types/collection';

export interface CollectionsFanWidgetProps {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;
  onOpenCreate: () => void;
  onSelectCollection: (collection: Collection) => void;
}

const PRIVACY_ICONS: Record<PrivacyLevel, typeof Globe> = {
  public: Globe,
  friends: Users,
  unlisted: Link2,
};

const FAN_TRANSFORMS: readonly string[] = [
  'translate3d(0px, 0px, 0) rotate(0deg) scale(1)',
  'translate3d(12px, -12px, 0) rotate(3deg) scale(0.96)',
  'translate3d(24px, -22px, 0) rotate(6deg) scale(0.92)',
] as const;

const FAN_Z_INDEX: readonly number[] = [30, 20, 10] as const;

export function CollectionsFanWidget({
  collections,
  activeCollectionId,
  isLoading,
  onOpenCreate,
  onSelectCollection,
}: Readonly<CollectionsFanWidgetProps>) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  useEffect(() => {
    setOrderedIds((prev) => {
      const incomingIds = collections.map((col) => col.id);
      const preserved = prev.filter((id) => incomingIds.includes(id));
      const added = incomingIds.filter((id) => !preserved.includes(id));
      return [...added, ...preserved];
    });
  }, [collections]);

  const orderedCollections = orderedIds
    .map((id) => collections.find((col) => col.id === id))
    .filter((item): item is Collection => Boolean(item))
    .slice(0, 3);

  const handleCardClick = (collection: Collection, stackIndex: number) => {
    if (stackIndex > 0) {
      setOrderedIds((prev) => [collection.id, ...prev.filter((id) => id !== collection.id)]);
      return;
    }
    onSelectCollection(collection);
  };

  return (
    <section
      aria-label="Widget de coleções"
      className="flex flex-col gap-3 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-warning" aria-hidden="true" />
          <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            COLEÇÕES
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Criar nova coleção"
          title="Criar nova coleção"
          className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-primary transition-colors hover:border-success hover:bg-success hover:text-bg-deep"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {isLoading ? (
        <div
          aria-busy="true"
          aria-label="Carregando coleções"
          className="h-44 w-full animate-pulse rounded-card border border-border-muted bg-bg-elevated"
        />
      ) : orderedCollections.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 rounded-card border-[1.5px] border-dashed border-border-muted bg-bg-deep px-4 py-6 text-center">
          <p className="font-mono text-mono-meta text-text-secondary">
            Crie coleções para agrupar suas melhores jogadas.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-control bg-success px-3.5 py-2 font-display text-display-cta uppercase tracking-[0.06em] text-bg-deep transition-colors hover:bg-success-surface hover:text-text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            NOVA COLEÇÃO
          </button>
        </div>
      ) : (
        <div className="relative mx-auto flex min-h-[192px] w-full max-w-[320px] items-end justify-center pb-2 pt-7">
          {orderedCollections.map((collection, index) => {
            const isFront = index === 0;
            const isActiveFilter = activeCollectionId === collection.id;
            const PrivacyIcon = PRIVACY_ICONS[collection.privacy];
            const accent = collection.accent_color || '#2EB886';

            return (
              <button
                key={collection.id}
                type="button"
                data-testid={`collection-fan-card-${collection.id}`}
                data-front={isFront ? 'true' : 'false'}
                aria-label={
                  isFront
                    ? `Filtrar pela coleção ${collection.title}`
                    : `Trazer coleção ${collection.title} para frente`
                }
                onClick={() => handleCardClick(collection, index)}
                style={{
                  transform: FAN_TRANSFORMS[index] ?? FAN_TRANSFORMS[2],
                  zIndex: FAN_Z_INDEX[index] ?? 5,
                }}
                className={`absolute bottom-2 left-0 right-6 flex h-[150px] flex-col justify-between rounded-card border-[1.5px] p-4 text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${
                  isFront
                    ? isActiveFilter
                      ? 'border-success bg-text-primary text-bg-deep shadow-xl'
                      : 'border-border-muted bg-text-primary text-bg-deep shadow-lg hover:border-success'
                    : 'border-border-muted bg-bg-elevated text-text-primary hover:-translate-y-1.5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="h-1.5 w-10 rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  />
                  <span
                    className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 font-mono text-mono-badge uppercase ${
                      isFront
                        ? 'bg-bg-deep text-text-primary'
                        : 'border border-border-muted bg-bg-deep text-text-secondary'
                    }`}
                  >
                    <PrivacyIcon className="h-3 w-3" aria-hidden="true" />
                    {collection.clips_count} {collection.clips_count === 1 ? 'CLIPE' : 'CLIPES'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    className={`line-clamp-1 font-display text-display-md uppercase tracking-[0.06em] ${
                      isFront ? 'text-bg-deep' : 'text-text-primary'
                    }`}
                  >
                    {collection.title}
                  </h3>
                  <p
                    className={`line-clamp-1 font-mono text-mono-badge ${
                      isFront ? 'text-bg-surface' : 'text-text-secondary'
                    }`}
                  >
                    {collection.description || `Por @${collection.owner.username}`}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-mono-badge font-semibold uppercase ${
                      isFront ? 'text-bg-deep' : 'text-text-muted'
                    }`}
                  >
                    {isFront
                      ? isActiveFilter
                        ? 'COLEÇÃO ATIVA'
                        : 'CLIQUE PARA FILTRAR'
                      : 'TRAZER PARA FRENTE'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
