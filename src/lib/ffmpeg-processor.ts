import { buildFfmpegArgs, needsFfmpegProcessing } from '@/lib/video-editor-utils';
import type { ClipEditSettings, VideoMimeType } from '@/types/clip';

export const FFMPEG_CORE_CDN_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

export class FfmpegProcessingError extends Error {
  public readonly isAborted: boolean;

  constructor(message: string, options: { isAborted?: boolean } = {}) {
    super(message);
    this.name = 'FfmpegProcessingError';
    this.isAborted = options.isAborted ?? false;
  }
}

export interface FfmpegProgressEvent {
  progress: number;
  time?: number;
}

export interface FfmpegInstanceLike {
  loaded: boolean;
  load: (config: { coreURL: string; wasmURL: string }) => Promise<boolean>;
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>;
  exec: (args: string[]) => Promise<number>;
  readFile: (path: string) => Promise<Uint8Array | string>;
  deleteFile: (path: string) => Promise<boolean>;
  terminate: () => void;
  on: (event: 'progress', callback: (event: FfmpegProgressEvent) => void) => void;
  off: (event: 'progress', callback: (event: FfmpegProgressEvent) => void) => void;
}

export interface FfmpegLoaderAdapter {
  createInstance: () => Promise<FfmpegInstanceLike>;
  toBlobUrl: (url: string, mimeType: string) => Promise<string>;
  fileToBytes: (file: File) => Promise<Uint8Array>;
}

export interface ProcessClipParams {
  file: File;
  totalDuration: number;
  settings: ClipEditSettings;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  adapter?: FfmpegLoaderAdapter;
}

export interface ProcessClipResult {
  file: File;
  mimeType: VideoMimeType;
  wasProcessed: boolean;
}

let cachedFfmpeg: FfmpegInstanceLike | null = null;
let cachedCoreBlobUrl: string | null = null;
let cachedWasmBlobUrl: string | null = null;

async function createDefaultAdapter(): Promise<FfmpegLoaderAdapter> {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ]);

  return {
    createInstance: async () => new FFmpeg() as unknown as FfmpegInstanceLike,
    toBlobUrl: (url, mimeType) => toBlobURL(url, mimeType),
    fileToBytes: (file) => fetchFile(file),
  };
}

async function getLoadedFfmpeg(adapter: FfmpegLoaderAdapter): Promise<FfmpegInstanceLike> {
  if (cachedFfmpeg?.loaded) {
    return cachedFfmpeg;
  }

  const instance = await adapter.createInstance();
  if (!cachedCoreBlobUrl) {
    cachedCoreBlobUrl = await adapter.toBlobUrl(
      `${FFMPEG_CORE_CDN_BASE_URL}/ffmpeg-core.js`,
      'text/javascript',
    );
  }
  if (!cachedWasmBlobUrl) {
    cachedWasmBlobUrl = await adapter.toBlobUrl(
      `${FFMPEG_CORE_CDN_BASE_URL}/ffmpeg-core.wasm`,
      'application/wasm',
    );
  }

  await instance.load({
    coreURL: cachedCoreBlobUrl,
    wasmURL: cachedWasmBlobUrl,
  });

  cachedFfmpeg = instance;
  return instance;
}

export function resetFfmpegCache(): void {
  if (cachedFfmpeg) {
    try {
      cachedFfmpeg.terminate();
    } catch {
      // Ignore termination errors during cleanup
    }
    cachedFfmpeg = null;
  }
  cachedCoreBlobUrl = null;
  cachedWasmBlobUrl = null;
}

async function safeDeleteMemfsFile(ffmpeg: FfmpegInstanceLike, fileName: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(fileName);
  } catch {
    // Ignore cleanup errors for files that were never created
  }
}

function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[^/.]+$/, '').trim() || 'clip';
  return `${base}-edited.mp4`;
}

function normalizeProgressPercent(rawProgress: number): number {
  if (!Number.isFinite(rawProgress)) {
    return 0;
  }
  const scaled = Math.round(rawProgress * 100);
  return Math.max(1, Math.min(99, scaled));
}

async function runExecWithFallback(params: {
  ffmpeg: FfmpegInstanceLike;
  inputName: string;
  outputName: string;
  settings: ClipEditSettings;
  totalDuration: number;
}): Promise<void> {
  const { ffmpeg, inputName, outputName, settings, totalDuration } = params;

  if (settings.preset === 'original') {
    const fastArgs = buildFfmpegArgs({
      inputName,
      outputName,
      settings,
      totalDuration,
      fastCopy: true,
    });
    const fastExit = await ffmpeg.exec(fastArgs);
    if (fastExit === 0) {
      return;
    }
    await safeDeleteMemfsFile(ffmpeg, outputName);
  }

  const encodeArgs = buildFfmpegArgs({
    inputName,
    outputName,
    settings,
    totalDuration,
    fastCopy: false,
  });
  const exitCode = await ffmpeg.exec(encodeArgs);
  if (exitCode !== 0) {
    throw new FfmpegProcessingError(
      'Não foi possível renderizar o clipe no navegador. Tente outro preset ou recorte.',
    );
  }
}

export async function processClipWithFfmpeg(params: ProcessClipParams): Promise<ProcessClipResult> {
  const { file, totalDuration, settings, onProgress, signal } = params;

  if (signal?.aborted) {
    throw new FfmpegProcessingError('Renderização cancelada pelo usuário.', { isAborted: true });
  }

  if (!needsFfmpegProcessing(settings, totalDuration)) {
    onProgress?.(100);
    return {
      file,
      mimeType: (file.type === 'video/webm' ? 'video/webm' : 'video/mp4') as VideoMimeType,
      wasProcessed: false,
    };
  }

  const adapter = params.adapter ?? (await createDefaultAdapter());
  const inputExt = file.type === 'video/webm' ? 'webm' : 'mp4';
  const inputName = `clipai-in.${inputExt}`;
  const outputName = 'clipai-out.mp4';

  let ffmpeg: FfmpegInstanceLike | null = null;
  let aborted = false;

  const handleProgress = (event: FfmpegProgressEvent) => {
    if (!aborted) {
      onProgress?.(normalizeProgressPercent(event.progress));
    }
  };

  const handleAbort = () => {
    aborted = true;
    if (ffmpeg) {
      try {
        ffmpeg.terminate();
      } catch {
        // Ignore termination failure
      }
      if (cachedFfmpeg === ffmpeg) {
        cachedFfmpeg = null;
      }
    }
  };

  signal?.addEventListener('abort', handleAbort, { once: true });

  try {
    ffmpeg = await getLoadedFfmpeg(adapter);
    if (aborted || signal?.aborted) {
      throw new FfmpegProcessingError('Renderização cancelada pelo usuário.', { isAborted: true });
    }

    ffmpeg.on('progress', handleProgress);
    const inputBytes = await adapter.fileToBytes(file);
    await ffmpeg.writeFile(inputName, inputBytes);

    await runExecWithFallback({
      ffmpeg,
      inputName,
      outputName,
      settings,
      totalDuration,
    });

    if (aborted || signal?.aborted) {
      throw new FfmpegProcessingError('Renderização cancelada pelo usuário.', { isAborted: true });
    }

    const rawOutput = await ffmpeg.readFile(outputName);
    if (!(rawOutput instanceof Uint8Array) || rawOutput.byteLength === 0) {
      throw new FfmpegProcessingError('O vídeo renderizado resultou vazio. Tente novamente.');
    }

    const copiedBuffer = new Uint8Array(rawOutput.byteLength);
    copiedBuffer.set(rawOutput);
    const processedFile = new File([copiedBuffer], buildOutputFileName(file.name), {
      type: 'video/mp4',
    });

    onProgress?.(100);
    return {
      file: processedFile,
      mimeType: 'video/mp4',
      wasProcessed: true,
    };
  } catch (err: unknown) {
    if (aborted || signal?.aborted) {
      throw new FfmpegProcessingError('Renderização cancelada pelo usuário.', { isAborted: true });
    }
    if (err instanceof FfmpegProcessingError) {
      throw err;
    }
    throw new FfmpegProcessingError(
      'Falha ao processar o vídeo no navegador. Verifique o arquivo ou tente o preset Original.',
    );
  } finally {
    signal?.removeEventListener('abort', handleAbort);
    if (ffmpeg && !aborted) {
      ffmpeg.off('progress', handleProgress);
      await safeDeleteMemfsFile(ffmpeg, inputName);
      await safeDeleteMemfsFile(ffmpeg, outputName);
    }
  }
}
