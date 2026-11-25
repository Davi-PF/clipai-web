import { describe, expect, it } from 'vitest';
import { BASE_COLOR_TOKENS, SEMANTIC_COLOR_TOKENS, isOfficialHexColor } from '@/lib/design-tokens';
import {
  MAX_AVATAR_SIZE_BYTES,
  MAX_BIO_LENGTH,
  MAX_VIDEO_SIZE_BYTES,
  formatDurationBadge,
  formatFileSizeMb,
  normalizeTagSlug,
  validateAvatarFileMeta,
  validateBio,
  validateClipDuration,
  validateDisplayName,
  validateEmail,
  validateLoginPassword,
  validatePasswordConfirmation,
  validatePasswordStrength,
  validateTwoFactorCode,
  validateUsername,
  validateVideoFileMeta,
} from '@/lib/validators';

describe('design-tokens', () => {
  it('defines the 7 base Cold Dark Mode tokens and 6 semantic tokens', () => {
    expect(BASE_COLOR_TOKENS).toHaveLength(7);
    expect(SEMANTIC_COLOR_TOKENS).toHaveLength(6);

    expect(isOfficialHexColor('#061C2C')).toBe(true);
    expect(isOfficialHexColor('#193347')).toBe(true);
    expect(isOfficialHexColor('#334B60')).toBe(true);
    expect(isOfficialHexColor('#4F6478')).toBe(true);
    expect(isOfficialHexColor('#6C7F91')).toBe(true);
    expect(isOfficialHexColor('#91A1B2')).toBe(true);
    expect(isOfficialHexColor('#B7C7D6')).toBe(true);

    expect(isOfficialHexColor('#F06A76')).toBe(true);
    expect(isOfficialHexColor('#D93848')).toBe(true);
    expect(isOfficialHexColor('#8C2332')).toBe(true);
    expect(isOfficialHexColor('#E8B04B')).toBe(true);
    expect(isOfficialHexColor('#2EB886')).toBe(true);
    expect(isOfficialHexColor('#1D6F56')).toBe(true);

    expect(isOfficialHexColor('#FF00FF')).toBe(false);
  });
});

describe('validators & formatters', () => {
  it('validates video file MIME types and 100 MB size limit', () => {
    expect(validateVideoFileMeta({ type: 'video/mp4', size: 48_000_000 })).toEqual({
      valid: true,
      errorMessage: null,
    });
    expect(validateVideoFileMeta({ type: 'video/webm', size: MAX_VIDEO_SIZE_BYTES })).toEqual({
      valid: true,
      errorMessage: null,
    });

    const invalidType = validateVideoFileMeta({ type: 'video/avi', size: 10_000 });
    expect(invalidType.valid).toBe(false);
    expect(invalidType.errorMessage).toContain('MP4 ou WebM');

    const tooLarge = validateVideoFileMeta({
      type: 'video/mp4',
      size: MAX_VIDEO_SIZE_BYTES + 1,
    });
    expect(tooLarge.valid).toBe(false);
    expect(tooLarge.errorMessage).toContain('100 MB');
  });

  it('validates avatar image MIME types (.jpg/.png/.webp) and 5 MB size limit', () => {
    expect(validateAvatarFileMeta({ type: 'image/jpeg', size: 250_000 })).toEqual({
      valid: true,
      errorMessage: null,
    });
    expect(validateAvatarFileMeta({ type: 'image/png', size: 1_200_000 })).toEqual({
      valid: true,
      errorMessage: null,
    });
    expect(validateAvatarFileMeta({ type: 'image/webp', size: MAX_AVATAR_SIZE_BYTES })).toEqual({
      valid: true,
      errorMessage: null,
    });

    const invalidMime = validateAvatarFileMeta({ type: 'image/gif', size: 50_000 });
    expect(invalidMime.valid).toBe(false);
    expect(invalidMime.errorMessage).toContain('JPG, PNG ou WebP');

    const oversized = validateAvatarFileMeta({
      type: 'image/webp',
      size: MAX_AVATAR_SIZE_BYTES + 1,
    });
    expect(oversized.valid).toBe(false);
    expect(oversized.errorMessage).toContain('5 MB');
  });

  it('validates bio length up to 240 characters and 2FA / backup codes', () => {
    expect(validateBio('AWPer e criador de conteúdo.').valid).toBe(true);
    expect(validateBio('a'.repeat(MAX_BIO_LENGTH)).valid).toBe(true);
    const tooLongBio = validateBio('a'.repeat(MAX_BIO_LENGTH + 1));
    expect(tooLongBio.valid).toBe(false);
    expect(tooLongBio.errorMessage).toContain('240 caracteres');

    expect(validateTwoFactorCode('482910', false).valid).toBe(true);
    expect(validateTwoFactorCode('12345', false).valid).toBe(false);
    expect(validateTwoFactorCode('7K4M-9P2X', true).valid).toBe(true);
    expect(validateTwoFactorCode('bad', true).valid).toBe(false);
  });

  it('validates clip duration between 1 and 120 seconds', () => {
    expect(validateClipDuration(34.5)).toEqual({ valid: true, errorMessage: null });
    expect(validateClipDuration(0.5).valid).toBe(false);
    expect(validateClipDuration(120.5).valid).toBe(false);
    expect(validateClipDuration(Number.NaN).valid).toBe(false);
  });

  it('normalizes tag slugs and formats badges', () => {
    expect(normalizeTagSlug('  Clutch 1v4!  ')).toBe('clutch-1v4');
    expect(formatDurationBadge(34.4)).toBe('00:34');
    expect(formatDurationBadge(120)).toBe('02:00');
    expect(formatDurationBadge(-5)).toBe('00:00');
    expect(formatFileSizeMb(48_234_496)).toBe('46.0 MB');
    expect(formatFileSizeMb(0)).toBe('0.0 MB');
  });

  it('preserves ç, Ç and accented PT-BR letters literally when normalizing tags', () => {
    expect(normalizeTagSlug('espaço')).toBe('espaço');
    expect(normalizeTagSlug('çççç')).toBe('çççç');
    expect(normalizeTagSlug('testando adicionar com espaço')).toBe('testando-adicionar-com-espaço');
    expect(normalizeTagSlug('AÇÃO')).toBe('ação');
    expect(normalizeTagSlug('EDIÇÃO')).toBe('edição');
    expect(normalizeTagSlug('ÇÊÃÕÉÍÓÚ')).toBe('çêãõéíóú');
    expect(normalizeTagSlug('São Paulo — Clássico #1')).toBe('são-paulo-clássico-1');
    expect(normalizeTagSlug('uma tag muito longa com acentuação extra')).toBe(
      'uma-tag-muito-longa-com-acentu',
    );
    expect(normalizeTagSlug('---clutch-1v4---')).toBe('clutch-1v4');
    expect(normalizeTagSlug('---')).toBe('');
    expect(normalizeTagSlug(`${'a'.repeat(29)}-extra`)).toBe('a'.repeat(29));
    expect(normalizeTagSlug(`---${'a'.repeat(30)}---`)).toBe('a'.repeat(30));
  });

  it('validates auth fields with PT-BR error messages', () => {
    expect(validateEmail('fallen@clipai.com.br').valid).toBe(true);
    expect(validateEmail('invalido').valid).toBe(false);

    expect(validateUsername('fallen_br').valid).toBe(true);
    expect(validateUsername('ab').valid).toBe(false);
    expect(validateUsername('nome-invalido!').valid).toBe(false);

    expect(validateDisplayName('Gabriel Toledo').valid).toBe(true);
    expect(validateDisplayName('A').valid).toBe(false);

    expect(validatePasswordStrength('StrongPass!2026').valid).toBe(true);
    expect(validatePasswordStrength('weak').valid).toBe(false);
    expect(validatePasswordStrength('SemSimbolo123').valid).toBe(false);

    expect(validatePasswordConfirmation('StrongPass!2026', 'StrongPass!2026').valid).toBe(true);
    expect(validatePasswordConfirmation('StrongPass!2026', 'Diferente!1').valid).toBe(false);

    expect(validateLoginPassword('qualquer').valid).toBe(true);
    expect(validateLoginPassword('').valid).toBe(false);
  });
});
