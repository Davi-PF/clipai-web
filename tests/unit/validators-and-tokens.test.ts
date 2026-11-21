import { describe, expect, it } from 'vitest';
import { BASE_COLOR_TOKENS, SEMANTIC_COLOR_TOKENS, isOfficialHexColor } from '@/lib/design-tokens';
import {
  MAX_VIDEO_SIZE_BYTES,
  formatDurationBadge,
  formatFileSizeMb,
  normalizeTagSlug,
  validateClipDuration,
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
});
