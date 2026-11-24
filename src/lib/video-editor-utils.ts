import { MAX_DURATION_SECONDS, MAX_VIDEO_SIZE_BYTES, MIN_DURATION_SECONDS } from '@/lib/validators';
import type { ClipEditEstimate, ClipEditSettings, ClipExportPreset } from '@/types/clip';

export const DEFAULT_EXPORT_PRESET: ClipExportPreset = '720p';
export const TRIM_EPSILON_SECONDS = 0.05;
export const SAFE_SEEK_END_MARGIN_SECONDS = 0.05;

export interface ExportPresetOption {
  id: ClipExportPreset;
  label: string;
  badge: string;
  description: string;
  maxHeight: number | null;
  crf: number;
  targetVideoKbps: number | null;
  audioBitrateKbps: number;
}

export const CLIP_EXPORT_PRESETS: readonly ExportPresetOption[] = [
  {
    id: 'original',
    label: 'Original',
    badge: 'SEM RE-ENCODE',
    description: 'Mantém resolução e bitrate originais (corte instantâneo).',
    maxHeight: null,
    crf: 20,
    targetVideoKbps: null,
    audioBitrateKbps: 160,
  },
  {
    id: '720p',
    label: '720p Otimizado',
    badge: 'RECOMENDADO',
    description: 'Ótima nitidez em 720p com forte economia de espaço no R2.',
    maxHeight: 720,
    crf: 24,
    targetVideoKbps: 2600,
    audioBitrateKbps: 128,
  },
  {
    id: '480p',
    label: '480p Leve',
    badge: 'ULTRA LEVE',
    description: 'Arquivo compacto ideal para envios rápidos e clipes longos.',
    maxHeight: 480,
    crf: 28,
    targetVideoKbps: 1100,
    audioBitrateKbps: 96,
  },
] as const;

export function getExportPresetOption(preset: ClipExportPreset): ExportPresetOption {
  return CLIP_EXPORT_PRESETS.find((option) => option.id === preset) ?? CLIP_EXPORT_PRESETS[1]!;
}

export function roundTimeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }
  return Math.round(seconds * 100) / 100;
}

export function clampSafeSeekTime(targetSeconds: number, durationSeconds: number): number {
  if (!Number.isFinite(targetSeconds) || targetSeconds <= 0) {
    return 0;
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return roundTimeSeconds(targetSeconds);
  }
  const maxSafeTime = Math.max(0, durationSeconds - SAFE_SEEK_END_MARGIN_SECONDS);
  return roundTimeSeconds(Math.min(maxSafeTime, Math.max(0, targetSeconds)));
}

export function createDefaultEditSettings(
  totalDurationSeconds: number,
  preset: ClipExportPreset = DEFAULT_EXPORT_PRESET,
): ClipEditSettings {
  const safeDuration = Math.max(MIN_DURATION_SECONDS, roundTimeSeconds(totalDurationSeconds));
  const endTime = roundTimeSeconds(Math.min(safeDuration, MAX_DURATION_SECONDS));
  const thumbnailTimeSeconds = roundTimeSeconds(Math.min(1, endTime * 0.1));

  return {
    startTime: 0,
    endTime,
    preset,
    muteAudio: false,
    thumbnailTimeSeconds,
  };
}

export function clampTrimRange(params: {
  startTime: number;
  endTime: number;
  totalDuration: number;
  changedHandle: 'start' | 'end';
  maxDuration?: number;
}): { startTime: number; endTime: number } {
  const safeTotal = Math.max(MIN_DURATION_SECONDS, roundTimeSeconds(params.totalDuration));
  const maxAllowed = Math.min(safeTotal, params.maxDuration ?? MAX_DURATION_SECONDS);
  const minAllowed = Math.min(safeTotal, MIN_DURATION_SECONDS);

  let start = Math.max(0, Math.min(safeTotal, roundTimeSeconds(params.startTime)));
  let end = Math.max(0, Math.min(safeTotal, roundTimeSeconds(params.endTime)));

  if (params.changedHandle === 'start') {
    if (end - start < minAllowed) {
      start = Math.max(0, end - minAllowed);
      if (end - start < minAllowed) {
        end = Math.min(safeTotal, start + minAllowed);
      }
    }
    if (end - start > maxAllowed) {
      end = Math.min(safeTotal, start + maxAllowed);
    }
  } else {
    if (end - start < minAllowed) {
      end = Math.min(safeTotal, start + minAllowed);
      if (end - start < minAllowed) {
        start = Math.max(0, end - minAllowed);
      }
    }
    if (end - start > maxAllowed) {
      start = Math.max(0, end - maxAllowed);
    }
  }

  return {
    startTime: roundTimeSeconds(start),
    endTime: roundTimeSeconds(end),
  };
}

export function isVideoTrimmed(settings: ClipEditSettings, totalDuration: number): boolean {
  return (
    settings.startTime > TRIM_EPSILON_SECONDS ||
    settings.endTime < totalDuration - TRIM_EPSILON_SECONDS
  );
}

export function needsFfmpegProcessing(settings: ClipEditSettings, totalDuration: number): boolean {
  return (
    settings.preset !== 'original' || settings.muteAudio || isVideoTrimmed(settings, totalDuration)
  );
}

export function estimateEditedClipSize(params: {
  originalBytes: number;
  totalDuration: number;
  settings: ClipEditSettings;
}): ClipEditEstimate {
  const safeTotal = Math.max(0.1, params.totalDuration);
  const durationSeconds = roundTimeSeconds(
    Math.max(MIN_DURATION_SECONDS, params.settings.endTime - params.settings.startTime),
  );
  const durationRatio = Math.min(1, durationSeconds / safeTotal);
  const proportionalOriginalBytes = Math.max(1, Math.round(params.originalBytes * durationRatio));
  const presetOption = getExportPresetOption(params.settings.preset);

  let estimatedBytes = proportionalOriginalBytes;

  if (presetOption.targetVideoKbps === null) {
    if (params.settings.muteAudio) {
      const audioBytesSaved = Math.round(((128 * 1000) / 8) * durationSeconds);
      estimatedBytes = Math.max(
        Math.round(proportionalOriginalBytes * 0.15),
        proportionalOriginalBytes - audioBytesSaved,
      );
    }
  } else {
    const audioKbps = params.settings.muteAudio ? 0 : presetOption.audioBitrateKbps;
    const totalKbps = presetOption.targetVideoKbps + audioKbps;
    const targetBytes = Math.max(1, Math.round(((totalKbps * 1000) / 8) * durationSeconds));
    estimatedBytes = Math.min(proportionalOriginalBytes, targetBytes);
  }

  const rawSavings =
    params.originalBytes > 0
      ? Math.round(((params.originalBytes - estimatedBytes) / params.originalBytes) * 100)
      : 0;
  const savingsPercent = Math.max(0, Math.min(99, rawSavings));

  return {
    durationSeconds,
    estimatedBytes,
    originalBytes: params.originalBytes,
    savingsPercent,
    exceedsMaxSize: estimatedBytes > MAX_VIDEO_SIZE_BYTES,
    requiresProcessing: needsFfmpegProcessing(params.settings, params.totalDuration),
  };
}

export function buildFfmpegArgs(params: {
  inputName: string;
  outputName: string;
  settings: ClipEditSettings;
  totalDuration: number;
  fastCopy?: boolean;
}): string[] {
  const { inputName, outputName, settings, totalDuration, fastCopy = false } = params;
  const trimmed = isVideoTrimmed(settings, totalDuration);
  const clipDuration = roundTimeSeconds(
    Math.max(MIN_DURATION_SECONDS, settings.endTime - settings.startTime),
  );
  const args: string[] = [];

  if (trimmed) {
    args.push('-ss', settings.startTime.toFixed(2));
  }

  args.push('-i', inputName);

  if (trimmed) {
    args.push('-t', clipDuration.toFixed(2));
  }

  if (fastCopy && settings.preset === 'original') {
    args.push('-c:v', 'copy');
    if (settings.muteAudio) {
      args.push('-an');
    } else {
      args.push('-c:a', 'copy');
    }
    args.push('-movflags', '+faststart', outputName);
    return args;
  }

  const presetOption = getExportPresetOption(settings.preset);

  if (presetOption.maxHeight !== null) {
    args.push('-vf', `scale=-2:'min(${presetOption.maxHeight},ih)'`);
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    String(presetOption.crf),
    '-pix_fmt',
    'yuv420p',
  );

  if (settings.muteAudio) {
    args.push('-an');
  } else {
    args.push('-c:a', 'aac', '-b:a', `${presetOption.audioBitrateKbps}k`);
  }

  args.push('-movflags', '+faststart', outputName);
  return args;
}

export function formatPreciseTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.0';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const tenths = Math.floor((secs - wholeSecs) * 10);
  return `${String(mins).padStart(2, '0')}:${String(wholeSecs).padStart(2, '0')}.${tenths}`;
}
