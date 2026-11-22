// ============================================================================
// 1. Enums & Literal Types
// ============================================================================

export type PrivacyLevel = 'public' | 'unlisted' | 'friends';

export type ClipStatus = 'pending_upload' | 'ready' | 'failed';

export type VideoMimeType = 'video/mp4' | 'video/webm';

export type ThumbnailMimeType = 'image/webp' | 'image/jpeg' | 'image/png';

export type AvatarMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export type AvatarSource = 'custom' | 'discord' | 'none';

export type DiscordAuthMode = 'login' | 'link';

export type ClipSortOption = 'recent' | 'popular' | 'featured';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UPLOAD_VERIFICATION_FAILED'
  | 'INVALID_2FA_CODE'
  | 'DISCORD_OAUTH_FAILED'
  | 'PASSWORD_REQUIRED_BEFORE_UNLINK'
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
  avatar_source?: AvatarSource;
  has_custom_avatar?: boolean;
  bio?: string | null;
  discord_linked?: boolean;
  discord_username?: string | null;
  discord_avatar_url?: string | null;
  discord_linked_at?: string | null;
  is_email_verified: boolean;
  is_2fa_enabled: boolean;
  has_password?: boolean;
  created_at?: string;
}

export interface UserPublicStats {
  clips_count: number;
  total_views: number;
  total_likes: number;
  collections_count: number;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_source?: AvatarSource;
  bio: string | null;
  discord_linked?: boolean;
  discord_username?: string | null;
  stats?: UserPublicStats;
  clips_count?: number;
  total_views?: number;
  total_likes?: number;
  collections_count?: number;
  created_at: string;
}

export interface ClipAuthorSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  discord_linked?: boolean;
  discord_username?: string | null;
  is_2fa_enabled?: boolean;
  has_password?: boolean;
}

export interface UserUpdateRequest {
  display_name?: string | null;
  bio?: string | null;
  avatar_source?: AvatarSource;
}

export interface AvatarUploadUrlRequest {
  mime_type: AvatarMimeType;
  size_bytes: number;
}

export interface AvatarPresignedTarget {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface AvatarUploadUrlResponse {
  avatar_key: string;
  object_key: string;
  upload_url: string;
  expires_in: number;
  avatar_upload: AvatarPresignedTarget;
}

export interface AvatarConfirmRequest {
  avatar_key: string;
}

export interface AuthLoginResponse {
  access_token: string | null;
  token_type: 'bearer';
  expires_in: number;
  requires_2fa: boolean;
  challenge_token?: string | null;
  temp_2fa_token: string | null;
  user: User;
}

export interface AuthRefreshResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  display_name: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface TwoFactorSetupResponse {
  otpauth_uri: string;
  manual_secret: string;
  secret: string;
  issuer: string;
}

export interface TwoFactorEnableRequest {
  code: string;
}

export interface TwoFactorEnableResponse {
  is_2fa_enabled: boolean;
  backup_codes: string[];
  message: string;
}

export interface TwoFactorDisableRequest {
  code: string;
  password?: string | null;
}

export interface TwoFactorVerifyLoginRequest {
  challenge_token: string;
  code: string;
}

export interface DiscordAuthUrlResponse {
  url: string;
  authorization_url: string;
  state: string;
  mode: DiscordAuthMode;
}

export interface DiscordCallbackRequest {
  code: string;
  state: string;
}

export interface DiscordCallbackResponse extends AuthLoginResponse {
  mode: DiscordAuthMode;
  linked: boolean;
  message?: string | null;
}

export interface ApiMessageResponse {
  message: string;
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
  slug?: string;
  status: 'pending_upload';
  expires_in: number;
  video_upload: PresignedPutTarget;
  thumbnail_upload: PresignedPutTarget | null;
}

export interface ClipSummary {
  id: string;
  slug?: string;
  title: string;
  privacy: PrivacyLevel;
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  favorites_count: number;
  is_liked?: boolean;
  is_favorited?: boolean;
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
  liked?: boolean;
  likes_count: number;
  is_liked_by_me: boolean;
}

export interface ClipFavoriteResponse {
  clip_id: string;
  favorited?: boolean;
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
  accent_color?: string | null;
  clips_count: number;
  preview_thumbnails?: string[];
  owner: CollectionOwnerSummary;
  created_at: string;
  updated_at: string;
}

export interface CollectionClipItem {
  position: number;
  added_at: string;
  clip: {
    id: string;
    slug?: string;
    title: string;
    video_url?: string;
    thumbnail_url: string;
    duration_seconds: number;
    views_count: number;
    likes_count: number;
    is_liked?: boolean;
    is_favorited?: boolean;
    is_liked_by_me?: boolean;
    is_favorited_by_me?: boolean;
  };
}

export interface CollectionDetail extends Collection {
  clips: CollectionClipItem[];
  page?: number;
  page_size?: number;
  total_pages?: number;
}
