import { describe, expect, it } from 'vitest';
import {
  MAX_DURATION_SECONDS,
  MAX_EDITOR_INPUT_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  validateEditorInputVideoMeta,
} from '@/lib/validators';
import {
  buildFfmpegArgs,
  clampSafeSeekTime,
  clampTrimRange,
  createDefaultEditSettings,
  DEFAULT_EXPORT_PRESET,
  estimateEditedClipSize,
  formatPreciseTime,
  getExportPresetOption,
  isVideoTrimmed,
  needsFfmpegProcessing,
  roundTimeSeconds,
  SAFE_SEEK_END_MARGIN_SECONDS,
} from '@/lib/video-editor-utils';

describe('video-editor-utils & editor input validation', () => {
  it('validates editor input file metadata up to 500 MB for MP4/WebM', () => {
    expect(validateEditorInputVideoMeta({ type: 'video/mp4', size: 250_000_000 }).valid).toBe(true);
    expect(validateEditorInputVideoMeta({ type: 'video/avi', size: 10_000 }).valid).toBe(false);
    expect(
      validateEditorInputVideoMeta({ type: 'video/webm', size: MAX_EDITOR_INPUT_SIZE_BYTES + 1 })
        .valid,
    ).toBe(false);
    expect(validateEditorInputVideoMeta({ type: 'video/mp4', size: 0 }).valid).toBe(false);
  });

  it('creates default edit settings using 720p preset and clamping endTime at 120s', () => {
    const shortDefaults = createDefaultEditSettings(34.5);
    expect(shortDefaults.preset).toBe(DEFAULT_EXPORT_PRESET);
    expect(shortDefaults.startTime).toBe(0);
    expect(shortDefaults.endTime).toBe(34.5);
    expect(shortDefaults.muteAudio).toBe(false);

    const longDefaults = createDefaultEditSettings(240);
    expect(longDefaults.endTime).toBe(MAX_DURATION_SECONDS);
    expect(longDefaults.thumbnailTimeSeconds).toBe(1);
  });

  it('clamps trim ranges enforcing 1s minimum and 120s maximum duration on both handles', () => {
    // Drag start past end -> respects minimum 1s gap
    expect(
      clampTrimRange({
        startTime: 29.8,
        endTime: 30,
        totalDuration: 40,
        changedHandle: 'start',
      }),
    ).toEqual({ startTime: 29, endTime: 30 });

    // Drag start near 0 when end < 1s -> pushes end forward
    expect(
      clampTrimRange({
        startTime: 0,
        endTime: 0.4,
        totalDuration: 10,
        changedHandle: 'start',
      }),
    ).toEqual({ startTime: 0, endTime: 1 });

    // Drag end before start -> respects minimum 1s gap
    expect(
      clampTrimRange({
        startTime: 10,
        endTime: 10.2,
        totalDuration: 30,
        changedHandle: 'end',
      }),
    ).toEqual({ startTime: 10, endTime: 11 });

    // Drag end near totalDuration when start is close -> pulls start back
    expect(
      clampTrimRange({
        startTime: 9.7,
        endTime: 10,
        totalDuration: 10,
        changedHandle: 'end',
      }),
    ).toEqual({ startTime: 9, endTime: 10 });

    // Exceed maxDuration from start handle -> pulls end back
    expect(
      clampTrimRange({
        startTime: 5,
        endTime: 180,
        totalDuration: 200,
        changedHandle: 'start',
        maxDuration: 120,
      }),
    ).toEqual({ startTime: 5, endTime: 125 });

    // Exceed maxDuration from end handle -> pushes start forward
    expect(
      clampTrimRange({
        startTime: 10,
        endTime: 170,
        totalDuration: 200,
        changedHandle: 'end',
        maxDuration: 120,
      }),
    ).toEqual({ startTime: 50, endTime: 170 });
  });

  it('detects trimming and processing needs accurately', () => {
    const untouchedOriginal = {
      startTime: 0,
      endTime: 30,
      preset: 'original' as const,
      muteAudio: false,
      thumbnailTimeSeconds: 1,
    };
    expect(isVideoTrimmed(untouchedOriginal, 30)).toBe(false);
    expect(needsFfmpegProcessing(untouchedOriginal, 30)).toBe(false);

    expect(isVideoTrimmed({ ...untouchedOriginal, startTime: 2 }, 30)).toBe(true);
    expect(needsFfmpegProcessing({ ...untouchedOriginal, muteAudio: true }, 30)).toBe(true);
    expect(needsFfmpegProcessing({ ...untouchedOriginal, preset: '720p' }, 30)).toBe(true);
  });

  it('estimates output size, savings percent and 100 MB overflow warnings across presets', () => {
    const originalBytes = 80 * 1024 * 1024;
    const est720 = estimateEditedClipSize({
      originalBytes,
      totalDuration: 60,
      settings: createDefaultEditSettings(60, '720p'),
    });
    expect(est720.estimatedBytes).toBeLessThan(originalBytes);
    expect(est720.savingsPercent).toBeGreaterThan(50);
    expect(est720.exceedsMaxSize).toBe(false);

    const est480Muted = estimateEditedClipSize({
      originalBytes,
      totalDuration: 60,
      settings: { ...createDefaultEditSettings(60, '480p'), muteAudio: true },
    });
    expect(est480Muted.estimatedBytes).toBeLessThan(est720.estimatedBytes);

    const estOriginalMuted = estimateEditedClipSize({
      originalBytes: 20 * 1024 * 1024,
      totalDuration: 30,
      settings: { ...createDefaultEditSettings(30, 'original'), muteAudio: true },
    });
    expect(estOriginalMuted.estimatedBytes).toBeLessThan(20 * 1024 * 1024);

    const estTooBig = estimateEditedClipSize({
      originalBytes: MAX_VIDEO_SIZE_BYTES + 30_000_000,
      totalDuration: 60,
      settings: createDefaultEditSettings(60, 'original'),
    });
    expect(estTooBig.exceedsMaxSize).toBe(true);
  });

  it('builds deterministic FFmpeg CLI arguments for fast copy, 720p and 480p with audio/mute', () => {
    const fastCopyArgs = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      totalDuration: 40,
      fastCopy: true,
      settings: {
        startTime: 5,
        endTime: 25,
        preset: 'original',
        muteAudio: false,
        thumbnailTimeSeconds: 5,
      },
    });
    expect(fastCopyArgs).toEqual([
      '-ss',
      '5.00',
      '-i',
      'in.mp4',
      '-t',
      '20.00',
      '-c:v',
      'copy',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      'out.mp4',
    ]);

    const fastCopyMuted = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      totalDuration: 40,
      fastCopy: true,
      settings: {
        startTime: 0,
        endTime: 40,
        preset: 'original',
        muteAudio: true,
        thumbnailTimeSeconds: 1,
      },
    });
    expect(fastCopyMuted).toContain('-an');
    expect(fastCopyMuted).not.toContain('-ss');

    const args720 = buildFfmpegArgs({
      inputName: 'in.webm',
      outputName: 'out.mp4',
      totalDuration: 30,
      settings: createDefaultEditSettings(30, '720p'),
    });
    expect(args720).toContain('-vf');
    expect(args720).toContain("scale=-2:'min(720,ih)'");
    expect(args720).toContain('libx264');
    expect(args720).toContain('128k');

    const args480Muted = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      totalDuration: 30,
      settings: { ...createDefaultEditSettings(30, '480p'), muteAudio: true },
    });
    expect(args480Muted).toContain("scale=-2:'min(480,ih)'");
    expect(args480Muted).toContain('-an');
    expect(getExportPresetOption('480p').crf).toBe(28);
  });

  it('formats precise timestamps and rounds edge values safely', () => {
    expect(formatPreciseTime(0)).toBe('00:00.0');
    expect(formatPreciseTime(74.36)).toBe('01:14.3');
    expect(formatPreciseTime(-5)).toBe('00:00.0');
    expect(formatPreciseTime(Number.NaN)).toBe('00:00.0');
    expect(roundTimeSeconds(-1)).toBe(0);
    expect(roundTimeSeconds(12.345)).toBe(12.35);
  });

  it('clamps seek times safely between 0 and duration - 0.05s to avoid EOF decoder stalls', () => {
    expect(SAFE_SEEK_END_MARGIN_SECONDS).toBe(0.05);
    expect(clampSafeSeekTime(-3, 60)).toBe(0);
    expect(clampSafeSeekTime(Number.NaN, 60)).toBe(0);
    expect(clampSafeSeekTime(12.34, 60)).toBe(12.34);
    expect(clampSafeSeekTime(60, 60)).toBe(59.95);
    expect(clampSafeSeekTime(75, 60)).toBe(59.95);
    expect(clampSafeSeekTime(0.03, 0.04)).toBe(0);
    expect(clampSafeSeekTime(15.5, 0)).toBe(15.5);
  });
});
