import type {
  Clip,
  ClipAuthorSummary,
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
  game_slug?: string;
  game_id?: string;
  tag?: string;
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
  | 'preparing'
  | 'uploading_video'
  | 'uploading_thumbnail'
  | 'confirming'
  | 'success'
  | 'error';
