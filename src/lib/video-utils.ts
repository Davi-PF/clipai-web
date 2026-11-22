import {
  MAX_THUMBNAIL_SIZE_BYTES,
  validateClipDuration,
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

export async function extractVideoMetadataAndThumbnail(file: File): Promise<ExtractedVideoResult> {
  const fileMetaValidation = validateVideoFileMeta({ type: file.type, size: file.size });
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
    const durationValidation = validateClipDuration(rawDuration);
    if (!durationValidation.valid) {
      throw new VideoMetadataError(
        durationValidation.errorMessage ?? 'Duração de vídeo fora do limite permitido.',
      );
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
