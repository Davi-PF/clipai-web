import {
  MAX_THUMBNAIL_SIZE_BYTES,
  MIN_DURATION_SECONDS,
  validateClipDuration,
  validateEditorInputVideoMeta,
  validateVideoFileMeta,
} from '@/lib/validators';
import type { ExtractedVideoResult, ThumbnailMimeType, VideoMimeType } from '@/types/clip';

export class VideoMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoMetadataError';
  }
}

export function extractContainerFromMime(mimeType: VideoMimeType): 'mp4' | 'webm' {
  return mimeType === 'video/webm' ? 'webm' : 'mp4';
}

export function formatResolutionLabel(height: number): string {
  if (!Number.isFinite(height) || height <= 0) {
    return '720p';
  }
  if (height >= 2160) return '2160p';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return `${Math.round(height)}p`;
}

export function computeAspectRatio(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '16:9';
  }
  let a = Math.round(width);
  let b = Math.round(height);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return `${Math.round(width) / a}:${Math.round(height) / a}`;
}

export function computeTargetThumbnailSize(
  width: number,
  height: number,
  maxWidth = 1280,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxWidth, height: Math.round((maxWidth * 9) / 16) };
  }
  if (width <= maxWidth) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scaledHeight = Math.max(1, Math.round((height / width) * maxWidth));
  return { width: maxWidth, height: scaledHeight };
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  successEvent: 'loadedmetadata' | 'seeked',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleSuccess = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new VideoMetadataError('Não foi possível processar o arquivo de vídeo selecionado.'));
    };
    const cleanup = () => {
      video.removeEventListener(successEvent, handleSuccess);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener(successEvent, handleSuccess, { once: true });
    video.addEventListener('error', handleError, { once: true });
  });
}

function canvasToBlobWithType(
  canvas: HTMLCanvasElement,
  mimeType: ThumbnailMimeType,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function captureFrameBlob(
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
): Promise<{ blob: Blob; mimeType: ThumbnailMimeType }> {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new VideoMetadataError('Não foi possível gerar a thumbnail no navegador.');
  }

  context.drawImage(video, 0, 0, targetWidth, targetHeight);

  const webpBlob = await canvasToBlobWithType(canvas, 'image/webp', 0.85);
  if (webpBlob && webpBlob.size > 0) {
    return { blob: webpBlob, mimeType: 'image/webp' };
  }

  const jpegBlob = await canvasToBlobWithType(canvas, 'image/jpeg', 0.88);
  if (jpegBlob && jpegBlob.size > 0) {
    return { blob: jpegBlob, mimeType: 'image/jpeg' };
  }

  throw new VideoMetadataError('Falha ao exportar a imagem de capa do clipe.');
}

export interface CapturedThumbnailResult {
  blob: Blob;
  mimeType: ThumbnailMimeType;
  sizeBytes: number;
  previewUrl: string;
}

export async function captureThumbnailFromVideoElement(
  video: HTMLVideoElement,
  maxWidth = 1280,
): Promise<CapturedThumbnailResult> {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const targetSize = computeTargetThumbnailSize(width, height, maxWidth);
  const { blob, mimeType } = await captureFrameBlob(video, targetSize.width, targetSize.height);

  if (blob.size > MAX_THUMBNAIL_SIZE_BYTES) {
    throw new VideoMetadataError('A imagem de capa gerada ultrapassou o limite de 5 MB.');
  }

  return {
    blob,
    mimeType,
    sizeBytes: blob.size,
    previewUrl: URL.createObjectURL(blob),
  };
}

export const DEFAULT_FILMSTRIP_FRAME_COUNT = 10;

export function computeFilmstripTimestamps(
  durationSeconds: number,
  frameCount = DEFAULT_FILMSTRIP_FRAME_COUNT,
): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || frameCount <= 0) {
    return [];
  }
  const safeCount = Math.max(1, Math.floor(frameCount));
  const step = durationSeconds / safeCount;
  const maxTime = Math.max(0, durationSeconds - 0.05);

  return Array.from({ length: safeCount }, (_, index) => {
    const midpoint = (index + 0.5) * step;
    return Math.round(Math.min(maxTime, Math.max(0, midpoint)) * 100) / 100;
  });
}

export interface ExtractFilmstripOptions {
  frameCount?: number;
  frameWidth?: number;
  signal?: AbortSignal;
}

export async function extractVideoFilmstripFrames(
  videoUrl: string,
  durationSeconds: number,
  options: ExtractFilmstripOptions = {},
): Promise<string[]> {
  const { frameCount = DEFAULT_FILMSTRIP_FRAME_COUNT, frameWidth = 160, signal } = options;

  const timestamps = computeFilmstripTimestamps(durationSeconds, frameCount);
  if (timestamps.length === 0 || signal?.aborted || typeof document === 'undefined') {
    return [];
  }

  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;

  const frames: string[] = [];

  try {
    const metadataPromise = waitForVideoEvent(video, 'loadedmetadata');
    video.src = videoUrl;
    video.load();
    await metadataPromise;

    if (signal?.aborted) {
      return [];
    }

    const width = video.videoWidth || 320;
    const height = video.videoHeight || 180;
    const targetSize = computeTargetThumbnailSize(width, height, frameWidth);
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return [];
    }

    for (const timestamp of timestamps) {
      if (signal?.aborted) {
        break;
      }
      const seekPromise = waitForVideoEvent(video, 'seeked');
      video.currentTime = timestamp;
      await seekPromise;

      if (signal?.aborted) {
        break;
      }

      context.drawImage(video, 0, 0, targetSize.width, targetSize.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      if (dataUrl) {
        frames.push(dataUrl);
      }
    }

    return frames;
  } catch {
    return frames;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

export interface ExtractVideoOptions {
  allowExtendedInput?: boolean;
}

export async function extractVideoMetadataAndThumbnail(
  file: File,
  options: ExtractVideoOptions = {},
): Promise<ExtractedVideoResult> {
  const fileMetaValidation = options.allowExtendedInput
    ? validateEditorInputVideoMeta({ type: file.type, size: file.size })
    : validateVideoFileMeta({ type: file.type, size: file.size });
  if (!fileMetaValidation.valid) {
    throw new VideoMetadataError(fileMetaValidation.errorMessage ?? 'Arquivo de vídeo inválido.');
  }

  const videoMimeType = file.type as VideoMimeType;
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    const metadataPromise = waitForVideoEvent(video, 'loadedmetadata');
    video.src = objectUrl;
    video.load();
    await metadataPromise;

    const rawDuration = Number(video.duration.toFixed(2));
    if (options.allowExtendedInput) {
      if (!Number.isFinite(rawDuration) || rawDuration < MIN_DURATION_SECONDS) {
        throw new VideoMetadataError('O clipe deve ter no mínimo 1 segundo de duração.');
      }
    } else {
      const durationValidation = validateClipDuration(rawDuration);
      if (!durationValidation.valid) {
        throw new VideoMetadataError(
          durationValidation.errorMessage ?? 'Duração de vídeo fora do limite permitido.',
        );
      }
    }

    const seekTime = Math.min(1, rawDuration * 0.1);
    const seekedPromise = waitForVideoEvent(video, 'seeked');
    video.currentTime = seekTime;
    await seekedPromise;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const targetSize = computeTargetThumbnailSize(width, height, 1280);
    const { blob: thumbnailBlob, mimeType: thumbnailMimeType } = await captureFrameBlob(
      video,
      targetSize.width,
      targetSize.height,
    );

    if (thumbnailBlob.size > MAX_THUMBNAIL_SIZE_BYTES) {
      throw new VideoMetadataError('A imagem de capa gerada ultrapassou o limite de 5 MB.');
    }

    const resolutionLabel = formatResolutionLabel(height);
    const aspectRatio = computeAspectRatio(width, height);
    const container = extractContainerFromMime(videoMimeType);
    const bitrateKbps = Math.max(1, Math.round((file.size * 8) / rawDuration / 1000));
    const thumbnailPreviewUrl = URL.createObjectURL(thumbnailBlob);

    return {
      durationSeconds: rawDuration,
      width,
      height,
      resolutionLabel,
      aspectRatio,
      bitrateKbps,
      container,
      videoMimeType,
      videoSizeBytes: file.size,
      thumbnailBlob,
      thumbnailMimeType,
      thumbnailSizeBytes: thumbnailBlob.size,
      thumbnailPreviewUrl,
      technicalMetadata: {
        container,
        width,
        height,
        resolution_label: resolutionLabel,
        bitrate_kbps: bitrateKbps,
        aspect_ratio: aspectRatio,
      },
    };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
