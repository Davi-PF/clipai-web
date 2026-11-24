import type {
  Clip,
  ClipAuthorSummary,
  ClipFavoriteResponse,
  ClipLikeResponse,
  ClipSortOption,
  ClipStatus,
  ClipSummary,
  ClipTechnicalMetadata,
  ClipViewResponse,
  Game,
  PaginatedResponse,
  PresignedPutTarget,
  PresignedUploadRequest,
  PresignedUploadResponse,
  PrivacyLevel,
  Tag,
  ThumbnailMimeType,
  VideoMimeType,
} from '@/types/api';

export type {
  Clip,
  ClipAuthorSummary,
  ClipFavoriteResponse,
  ClipLikeResponse,
  ClipSortOption,
  ClipStatus,
  ClipSummary,
  ClipTechnicalMetadata,
  ClipViewResponse,
  Game,
  PaginatedResponse,
  PresignedPutTarget,
  PresignedUploadRequest,
  PresignedUploadResponse,
  PrivacyLevel,
  Tag,
  ThumbnailMimeType,
  VideoMimeType,
};

export interface ListClipsParams {
  q?: string;
  game?: string;
  game_slug?: string;
  game_id?: string;
  tag?: string;
  author?: string;
  mine?: boolean;
  favorited?: boolean;
  collection_id?: string;
  sort?: ClipSortOption;
  page?: number;
  page_size?: number;
}

export interface ListGamesParams {
  q?: string;
  page?: number;
  page_size?: number;
}

export interface ListTagsParams {
  q?: string;
  limit?: number;
}

export interface ListUserClipsParams {
  page?: number;
  page_size?: number;
  privacy?: PrivacyLevel;
}

export interface TagListResponse {
  items: Tag[];
}

export interface UpdateClipRequest {
  title?: string;
  description?: string | null;
  game_id?: string;
  privacy?: PrivacyLevel;
  tags?: string[];
}

export type ClipExportPreset = 'original' | '720p' | '480p';

export interface ClipEditSettings {
  startTime: number;
  endTime: number;
  preset: ClipExportPreset;
  muteAudio: boolean;
  thumbnailTimeSeconds: number;
}

export interface ClipEditEstimate {
  durationSeconds: number;
  estimatedBytes: number;
  originalBytes: number;
  savingsPercent: number;
  exceedsMaxSize: boolean;
  requiresProcessing: boolean;
}

export interface ExtractedVideoResult {
  durationSeconds: number;
  width: number;
  height: number;
  resolutionLabel: string;
  aspectRatio: string;
  bitrateKbps: number;
  container: 'mp4' | 'webm';
  videoMimeType: VideoMimeType;
  videoSizeBytes: number;
  thumbnailBlob: Blob;
  thumbnailMimeType: ThumbnailMimeType;
  thumbnailSizeBytes: number;
  thumbnailPreviewUrl: string;
  technicalMetadata: ClipTechnicalMetadata;
}

export type ClipUploadStage =
  | 'idle'
  | 'rendering'
  | 'preparing'
  | 'uploading_video'
  | 'uploading_thumbnail'
  | 'confirming'
  | 'success'
  | 'error';

export function isClipLiked(clip: Pick<ClipSummary, 'is_liked' | 'is_liked_by_me'>): boolean {
  return Boolean(clip.is_liked ?? clip.is_liked_by_me);
}

export function isClipFavorited(
  clip: Pick<ClipSummary, 'is_favorited' | 'is_favorited_by_me'>,
): boolean {
  return Boolean(clip.is_favorited ?? clip.is_favorited_by_me);
}

export function getClipShareSlug(clip: Pick<ClipSummary, 'id' | 'slug'>): string {
  return clip.slug || clip.id;
}
