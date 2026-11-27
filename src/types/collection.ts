import type {
  Collection,
  CollectionClipItem,
  CollectionDetail,
  CollectionOwnerSummary,
  CollectionPrivacy,
  CollectionVisibility,
  PaginatedResponse,
  PrivacyLevel,
} from '@/types/api';

export type {
  Collection,
  CollectionClipItem,
  CollectionDetail,
  CollectionOwnerSummary,
  CollectionPrivacy,
  CollectionVisibility,
  PaginatedResponse,
  PrivacyLevel,
};

export interface ListCollectionsParams {
  mine?: boolean;
  author?: string;
  page?: number;
  page_size?: number;
}

export interface CreateCollectionRequest {
  title: string;
  description?: string | null;
  privacy: CollectionVisibility;
  show_on_profile?: boolean;
  accent_color?: string | null;
}

export interface UpdateCollectionRequest {
  title?: string;
  description?: string | null;
  privacy?: CollectionVisibility;
  show_on_profile?: boolean;
  accent_color?: string | null;
}

export interface AddClipToCollectionResponse {
  collection_id: string;
  clip_id: string;
  position: number;
  added_at: string;
}
