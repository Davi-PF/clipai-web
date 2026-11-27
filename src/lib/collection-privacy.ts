import type { CollectionPrivacy, CollectionVisibility } from '@/types/api';

export const COLLECTION_VISIBILITY_RANK: Record<CollectionVisibility, number> = {
  private: 0,
  friends: 1,
  public: 2,
};

export const COLLECTION_VISIBILITY_LABELS: Record<CollectionVisibility, string> = {
  public: 'Público',
  friends: 'Somente Amigos',
  private: 'Somente Eu',
};

export const COLLECTION_GLOBAL_VISIBILITY_LABELS: Record<CollectionVisibility, string> = {
  public: 'Público',
  friends: 'Somente Amigos',
  private: 'Somente Eu (Ninguém)',
};

export function normalizeCollectionVisibility(
  value?: CollectionPrivacy | null,
): CollectionVisibility {
  if (value === 'private' || value === 'friends' || value === 'public') {
    return value;
  }
  return 'public';
}

export function computeEffectiveVisibility(
  globalVisibility: CollectionVisibility,
  collectionPrivacy: CollectionVisibility,
): CollectionVisibility {
  const globalRank = COLLECTION_VISIBILITY_RANK[globalVisibility];
  const collectionRank = COLLECTION_VISIBILITY_RANK[collectionPrivacy];
  return globalRank <= collectionRank ? globalVisibility : collectionPrivacy;
}

export function isGlobalVisibilityMoreRestrictive(
  globalVisibility: CollectionVisibility,
  collectionPrivacy: CollectionVisibility,
): boolean {
  return (
    COLLECTION_VISIBILITY_RANK[globalVisibility] < COLLECTION_VISIBILITY_RANK[collectionPrivacy]
  );
}

export function getCollectionVisibilityLabel(visibility: CollectionVisibility): string {
  return COLLECTION_VISIBILITY_LABELS[visibility];
}

export function getCollectionGlobalVisibilityLabel(visibility: CollectionVisibility): string {
  return COLLECTION_GLOBAL_VISIBILITY_LABELS[visibility];
}
