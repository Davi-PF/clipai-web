// ============================================================================
// 1. Enums & Literal Types
// ============================================================================

export type PrivacyLevel = 'public' | 'unlisted' | 'friends';

export type ClipStatus = 'pending_upload' | 'ready' | 'failed';

export type VideoMimeType = 'video/mp4' | 'video/webm';

export type ThumbnailMimeType = 'image/webp' | 'image/jpeg' | 'image/png';

export type ClipSortOption = 'recent' | 'popular';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UPLOAD_VERIFICATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'EMAIL_NOT_VERIFIED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

// ============================================================================
// 2. Envelope de Paginação, Healthcheck e Erros Padronizados
// ============================================================================

export interface HealthCheckResponse {
  status: 'ok' | string;
  version: string;
  database: 'connected' | string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiErrorDetail {
  field: string;
  message: string; // Em PT-BR
}

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string; // Em PT-BR
    details?: ApiErrorDetail[];
    request_id: string;
  };
}

// ============================================================================
// 3. Usuário e Autenticação (User & Auth)
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string | null;
  is_email_verified: boolean;
  is_2fa_enabled: boolean; // Reservado no contrato desde o MVP para a v1.1
  created_at?: string;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface ClipAuthorSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface AuthLoginResponse {
  access_token: string | null;
  token_type: 'bearer';
  expires_in: number;
  requires_2fa: boolean; // Sempre false na v1.0; true na v1.1 quando 2FA ativo
  temp_2fa_token: string | null; // Reservado para o desafio TOTP na v1.1
  user: User;
}

export interface AuthRefreshResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

// ============================================================================
// 4. Catálogo: Jogos e Tags
// ============================================================================

export interface Game {
  id: string;
  name: string;
  slug: string;
  cover_url?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// ============================================================================
// 5. Clipes e Fluxo de Upload via Presigned URL
// ============================================================================

export interface ClipTechnicalMetadata {
  codec?: string;
  container: 'mp4' | 'webm';
  width: number;
  height: number;
  resolution_label: string;
  fps?: number;
  bitrate_kbps?: number;
  audio_codec?: string;
  audio_channels?: number;
  aspect_ratio: string;
}

export interface PresignedUploadRequest {
  title: string;
  description?: string | null;
  game_id: string;
  privacy: PrivacyLevel;
  tags: string[];
  video_mime_type: VideoMimeType;
  video_size_bytes: number;
  duration_seconds: number;
  thumbnail_mime_type: ThumbnailMimeType;
  thumbnail_size_bytes: number;
  technical_metadata: ClipTechnicalMetadata;
}

export interface PresignedPutTarget {
  url: string;
  method: 'PUT';
  headers: {
    'Content-Type': string;
    'Content-Length': string;
  };
}

export interface PresignedUploadResponse {
  clip_id: string;
  status: 'pending_upload';
  expires_in: number;
  video_upload: PresignedPutTarget;
  thumbnail_upload: PresignedPutTarget;
}

export interface ClipSummary {
  id: string;
  title: string;
  privacy: PrivacyLevel;
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  favorites_count: number;
  is_liked_by_me: boolean;
  is_favorited_by_me: boolean;
  author: ClipAuthorSummary;
  game: Game;
  tags: string[];
  created_at: string;
}

export interface Clip extends ClipSummary {
  description: string | null;
  status: ClipStatus;
  file_size_bytes: number;
  mime_type: VideoMimeType;
  technical_metadata: ClipTechnicalMetadata;
  updated_at: string;
}

export interface ClipLikeResponse {
  clip_id: string;
  likes_count: number;
  is_liked_by_me: boolean;
}

export interface ClipFavoriteResponse {
  clip_id: string;
  favorites_count: number;
  is_favorited_by_me: boolean;
}

export interface ClipViewResponse {
  clip_id: string;
  views_count: number;
}

// ============================================================================
// 6. Coleções (Playlists)
// ============================================================================

export interface CollectionOwnerSummary {
  id: string;
  username: string;
  display_name: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  privacy: PrivacyLevel;
  clips_count?: number;
  owner: CollectionOwnerSummary;
  created_at: string;
  updated_at: string;
}

export interface CollectionClipItem {
  position: number;
  added_at: string;
  clip: {
    id: string;
    title: string;
    thumbnail_url: string;
    duration_seconds: number;
    views_count: number;
    likes_count: number;
  };
}

export interface CollectionDetail extends Omit<Collection, 'clips_count'> {
  clips: CollectionClipItem[];
}
