import type { AvatarMimeType, VideoMimeType } from '@/types/api';

export const MAX_VIDEO_SIZE_BYTES = 104_857_600; // 100 MB
export const MAX_EDITOR_INPUT_SIZE_BYTES = 524_288_000; // 500 MB (entrada do editor antes de cortar/comprimir)
export const MAX_THUMBNAIL_SIZE_BYTES = 5_242_880; // 5 MB
export const MAX_AVATAR_SIZE_BYTES = 5_242_880; // 5 MB
export const MIN_DURATION_SECONDS = 1.0;
export const MAX_DURATION_SECONDS = 120.0;
export const MAX_TAGS_COUNT = 10;
export const MAX_BIO_LENGTH = 240;

export const ALLOWED_VIDEO_MIME_TYPES: readonly VideoMimeType[] = [
  'video/mp4',
  'video/webm',
] as const;

export const ALLOWED_AVATAR_MIME_TYPES: readonly AvatarMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export interface ValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

export function isAllowedVideoMimeType(mimeType: string): mimeType is VideoMimeType {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as VideoMimeType);
}

export function isAllowedAvatarMimeType(mimeType: string): mimeType is AvatarMimeType {
  return ALLOWED_AVATAR_MIME_TYPES.includes(mimeType.trim().toLowerCase() as AvatarMimeType);
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

export function validateEditorInputVideoMeta(file: {
  type: string;
  size: number;
}): ValidationResult {
  if (!isAllowedVideoMimeType(file.type)) {
    return {
      valid: false,
      errorMessage: 'Formato não suportado. Envie apenas arquivos MP4 ou WebM.',
    };
  }

  if (file.size <= 0 || file.size > MAX_EDITOR_INPUT_SIZE_BYTES) {
    return {
      valid: false,
      errorMessage: 'O arquivo excede o limite máximo de entrada do editor (500 MB).',
    };
  }

  return { valid: true, errorMessage: null };
}

export function validateAvatarFileMeta(file: { type: string; size: number }): ValidationResult {
  if (!isAllowedAvatarMimeType(file.type)) {
    return {
      valid: false,
      errorMessage: 'Formato de imagem não suportado. Use apenas JPG, PNG ou WebP.',
    };
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
    return {
      valid: false,
      errorMessage: 'A imagem de perfil não pode ultrapassar 5 MB.',
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

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const DIGIT_REGEX = /\d/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
const TOTP_CODE_REGEX = /^\d{6}$/;
const BACKUP_CODE_REGEX = /^[A-Za-z0-9-]{6,16}$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      errorMessage: 'Informe um endereço de e-mail válido.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      errorMessage: 'Use de 3 a 30 caracteres (apenas letras, números e sublinhado).',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateDisplayName(displayName: string): ValidationResult {
  const trimmed = displayName.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return {
      valid: false,
      errorMessage: 'Informe um nome de exibição entre 2 e 50 caracteres.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateBio(bio: string): ValidationResult {
  if (bio.trim().length > MAX_BIO_LENGTH) {
    return {
      valid: false,
      errorMessage: 'A biografia deve ter no máximo 240 caracteres.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateTwoFactorCode(code: string, isBackupCode = false): ValidationResult {
  const trimmed = code.trim();
  if (isBackupCode) {
    if (!BACKUP_CODE_REGEX.test(trimmed)) {
      return {
        valid: false,
        errorMessage: 'Informe um código de backup válido (ex.: 7K4M-9P2X).',
      };
    }
    return { valid: true, errorMessage: null };
  }

  if (!TOTP_CODE_REGEX.test(trimmed)) {
    return {
      valid: false,
      errorMessage: 'Informe o código numérico de 6 dígitos do seu autenticador.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validatePasswordStrength(password: string): ValidationResult {
  const hasMinLength = password.length >= 8 && password.length <= 128;
  const hasRequiredChars =
    UPPERCASE_REGEX.test(password) &&
    LOWERCASE_REGEX.test(password) &&
    DIGIT_REGEX.test(password) &&
    SPECIAL_CHAR_REGEX.test(password);

  if (!hasMinLength || !hasRequiredChars) {
    return {
      valid: false,
      errorMessage:
        'A senha deve ter entre 8 e 128 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): ValidationResult {
  if (!confirmation || password !== confirmation) {
    return {
      valid: false,
      errorMessage: 'As senhas não coincidem.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateLoginPassword(password: string): ValidationResult {
  if (!password) {
    return {
      valid: false,
      errorMessage: 'Informe sua senha.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateClipTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  if (trimmed.length < 3 || trimmed.length > 120) {
    return {
      valid: false,
      errorMessage: 'Informe um título entre 3 e 120 caracteres.',
    };
  }
  return { valid: true, errorMessage: null };
}

export function validateClipDescription(description: string): ValidationResult {
  if (description.trim().length > 1000) {
    return {
      valid: false,
      errorMessage: 'A descrição não pode ultrapassar 1.000 caracteres.',
    };
  }
  return { valid: true, errorMessage: null };
}
