'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FolderKanban, Globe, Link2, Plus, Users } from 'lucide-react';
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
  'translate3d(0px, -38px, 0) rotate(-2.2deg) scale(0.96)',
  'translate3d(0px, -74px, 0) rotate(2.2deg) scale(0.92)',
] as const;

const FAN_Z_INDEX: readonly number[] = [30, 20, 10] as const;

function getStackContainerHeight(count: number): string {
  if (count >= 3) {
    return 'min-h-[236px]';
  }
  if (count === 2) {
    return 'min-h-[198px]';
  }
  return 'min-h-[164px]';
}

function getFanCardSurfaceClass(isFront: boolean, isActiveFilter: boolean): string {
  if (!isFront) {
    return 'border-border-muted bg-bg-elevated text-text-primary shadow-md hover:border-success hover:bg-bg-surface';
  }
  if (isActiveFilter) {
    return 'border-success bg-text-primary text-bg-deep shadow-xl';
  }
  return 'border-border-muted bg-text-primary text-bg-deep shadow-lg hover:border-success';
}

function getFanCardActionLabel(isFront: boolean, isActiveFilter: boolean): string {
  if (!isFront) {
    return 'TRAZER PARA FRENTE';
  }
  return isActiveFilter ? 'COLEÇÃO ATIVA' : 'CLIQUE PARA FILTRAR';
}

interface CollectionFanCardProps {
  collection: Collection;
  index: number;
  activeCollectionId: string | null;
  onCardClick: (collection: Collection, stackIndex: number) => void;
}

function CollectionFanCard({
  collection,
  index,
  activeCollectionId,
  onCardClick,
}: Readonly<CollectionFanCardProps>) {
  const isFront = index === 0;
  const isActiveFilter = activeCollectionId === collection.id;
  const PrivacyIcon = PRIVACY_ICONS[collection.privacy];
  const accent = collection.accent_color || '#2EB886';

  return (
    <button
      type="button"
      data-testid={`collection-fan-card-${collection.id}`}
      data-front={isFront ? 'true' : 'false'}
      aria-label={
        isFront
          ? `Filtrar pela coleção ${collection.title}`
          : `Trazer coleção ${collection.title} para frente`
      }
      onClick={() => onCardClick(collection, index)}
      style={{
        transform: FAN_TRANSFORMS[index] ?? FAN_TRANSFORMS[2],
        zIndex: FAN_Z_INDEX[index] ?? 5,
      }}
      className={`absolute inset-x-1 bottom-2 flex h-[142px] flex-col justify-between rounded-card border-[1.5px] p-3.5 text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${getFanCardSurfaceClass(isFront, isActiveFilter)}`}
    >
      {/* Faixa superior visível mesmo quando o card está atrás no leque */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <span
            className={`truncate font-display text-display-md uppercase tracking-[0.06em] ${
              isFront ? 'text-bg-deep' : 'text-text-primary'
            }`}
          >
            {collection.title}
          </span>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-0.5 font-mono text-mono-badge uppercase ${
            isFront
              ? 'bg-bg-deep text-text-primary'
              : 'border border-border-muted bg-bg-deep text-text-secondary'
          }`}
        >
          <PrivacyIcon className="h-3 w-3" aria-hidden="true" />
          {collection.clips_count}
        </span>
      </div>

      <p
        className={`line-clamp-2 font-mono text-mono-badge ${
          isFront ? 'text-bg-surface' : 'text-text-secondary'
        }`}
      >
        {collection.description || `Por @${collection.owner.username}`}
      </p>

      <div className="flex items-center justify-between">
        <span
          className={`font-mono text-mono-badge font-semibold uppercase ${
            isFront ? 'text-bg-deep' : 'text-text-muted'
          }`}
        >
          {getFanCardActionLabel(isFront, isActiveFilter)}
        </span>
        <span
          className="h-1 w-8 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

interface CollectionsFanBodyProps {
  isLoading: boolean;
  orderedCollections: Collection[];
  activeCollectionId: string | null;
  stackContainerHeight: string;
  onOpenCreate: () => void;
  onCardClick: (collection: Collection, stackIndex: number) => void;
}

function CollectionsFanBody({
  isLoading,
  orderedCollections,
  activeCollectionId,
  stackContainerHeight,
  onOpenCreate,
  onCardClick,
}: Readonly<CollectionsFanBodyProps>) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando coleções"
        className="h-44 w-full animate-pulse rounded-card border border-border-muted bg-bg-elevated"
      />
    );
  }

  if (orderedCollections.length === 0) {
    return (
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
    );
  }

  return (
    <div
      className={`relative mx-auto flex w-full max-w-[328px] items-end justify-center pb-2 pt-3 ${stackContainerHeight}`}
    >
      {orderedCollections.map((collection, index) => (
        <CollectionFanCard
          key={collection.id}
          collection={collection}
          index={index}
          activeCollectionId={activeCollectionId}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}

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

  const rotateFan = (direction: 'next' | 'prev') => {
    setOrderedIds((prev) => {
      if (prev.length <= 1) return prev;
      if (direction === 'next') {
        const [first, ...rest] = prev;
        return first ? [...rest, first] : prev;
      }
      const last = prev.at(-1);
      return last ? [last, ...prev.slice(0, -1)] : prev;
    });
  };

  const handleCardClick = (collection: Collection, stackIndex: number) => {
    if (stackIndex > 0) {
      setOrderedIds((prev) => [collection.id, ...prev.filter((id) => id !== collection.id)]);
      return;
    }
    onSelectCollection(collection);
  };

  const stackContainerHeight = getStackContainerHeight(orderedCollections.length);

  return (
    <section
      aria-label="Widget de coleções"
      className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-warning" aria-hidden="true" />
          <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
            COLEÇÕES
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {orderedCollections.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => rotateFan('prev')}
                aria-label="Coleção anterior"
                title="Coleção anterior"
                className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => rotateFan('next')}
                aria-label="Próxima coleção"
                title="Próxima coleção"
                className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-secondary transition-colors hover:border-success hover:text-text-primary"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenCreate}
            aria-label="Criar nova coleção"
            title="Criar nova coleção"
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-elevated text-text-primary transition-colors hover:border-success hover:bg-success hover:text-bg-deep"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <CollectionsFanBody
        isLoading={isLoading}
        orderedCollections={orderedCollections}
        activeCollectionId={activeCollectionId}
        stackContainerHeight={stackContainerHeight}
        onOpenCreate={onOpenCreate}
        onCardClick={handleCardClick}
      />
    </section>
  );
}
