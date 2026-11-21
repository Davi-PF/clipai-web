import type { VideoMimeType } from '@/types/api';

export const MAX_VIDEO_SIZE_BYTES = 104_857_600; // 100 MB
export const MAX_THUMBNAIL_SIZE_BYTES = 5_242_880; // 5 MB
export const MIN_DURATION_SECONDS = 1.0;
export const MAX_DURATION_SECONDS = 120.0;
export const MAX_TAGS_COUNT = 10;

export const ALLOWED_VIDEO_MIME_TYPES: readonly VideoMimeType[] = [
  'video/mp4',
  'video/webm',
] as const;

export interface ValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

export function isAllowedVideoMimeType(mimeType: string): mimeType is VideoMimeType {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as VideoMimeType);
}

export function validateVideoFileMeta(file: { type: string; size: number }): ValidationResult {
  if (!isAllowedVideoMimeType(file.type)) {
    return {
      valid: false,
      errorMessage: 'Formato não suportado. Envie apenas arquivos MP4 ou WebM.',
    };
  }

  if (file.size <= 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      errorMessage: 'O arquivo excede o limite máximo de 100 MB.',
    };
  }

  return { valid: true, errorMessage: null };
}

export function validateClipDuration(durationSeconds: number): ValidationResult {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < MIN_DURATION_SECONDS ||
    durationSeconds > MAX_DURATION_SECONDS
  ) {
    return {
      valid: false,
      errorMessage: 'O clipe deve ter entre 1 e 120 segundos de duração.',
    };
  }

  return { valid: true, errorMessage: null };
}

export function normalizeTagSlug(rawTag: string): string {
  return rawTag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function formatDurationBadge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const rounded = Math.round(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatFileSizeMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0.0 MB';
  }
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
}
