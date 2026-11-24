import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FfmpegProcessingError,
  processClipWithFfmpeg,
  resetFfmpegCache,
  type FfmpegInstanceLike,
  type FfmpegLoaderAdapter,
  type FfmpegProgressEvent,
} from '@/lib/ffmpeg-processor';
import { createDefaultEditSettings } from '@/lib/video-editor-utils';

function createMockFfmpegAdapter(overrides?: {
  execImpl?: (
    args: string[],
    emitProgress: (event: FfmpegProgressEvent) => void,
  ) => Promise<number>;
  readFileImpl?: (path: string) => Promise<Uint8Array | string>;
}) {
  const progressListeners = new Set<(event: FfmpegProgressEvent) => void>();
  const deleteSpy = vi.fn().mockResolvedValue(true);
  const terminateSpy = vi.fn();
  const loadSpy = vi.fn().mockImplementation(async () => {
    instance.loaded = true;
    return true;
  });
  const writeFileSpy = vi.fn().mockResolvedValue(true);
  const execSpy = vi.fn().mockImplementation(async (args: string[]) => {
    const emit = (event: FfmpegProgressEvent) => {
      for (const cb of progressListeners) {
        cb(event);
      }
    };
    if (overrides?.execImpl) {
      return overrides.execImpl(args, emit);
    }
    emit({ progress: 0.42 });
    return 0;
  });
  const readFileSpy = vi
    .fn()
    .mockImplementation(
      overrides?.readFileImpl ?? (async () => new Uint8Array([1, 2, 3, 4, 5, 6])),
    );

  const instance: FfmpegInstanceLike = {
    loaded: false,
    load: loadSpy,
    writeFile: writeFileSpy,
    exec: execSpy,
    readFile: readFileSpy,
    deleteFile: deleteSpy,
    terminate: terminateSpy,
    on: (_event, cb) => progressListeners.add(cb),
    off: (_event, cb) => progressListeners.delete(cb),
  };

  const adapter: FfmpegLoaderAdapter = {
    createInstance: vi.fn().mockResolvedValue(instance),
    toBlobUrl: vi.fn().mockImplementation(async (url: string) => `blob:${url}`),
    fileToBytes: vi.fn().mockResolvedValue(new Uint8Array([9, 8, 7])),
  };

  return {
    adapter,
    instance,
    loadSpy,
    writeFileSpy,
    execSpy,
    readFileSpy,
    deleteSpy,
    terminateSpy,
  };
}

describe('ffmpeg-processor', () => {
  afterEach(() => {
    resetFfmpegCache();
    vi.restoreAllMocks();
  });

  it('bypasses FFmpeg completely when preset is original without trim or mute', async () => {
    const file = new File(['raw-video'], 'ace.mp4', { type: 'video/mp4' });
    const progressSpy = vi.fn();
    const { adapter } = createMockFfmpegAdapter();

    const result = await processClipWithFfmpeg({
      file,
      totalDuration: 25,
      settings: createDefaultEditSettings(25, 'original'),
      onProgress: progressSpy,
      adapter,
    });

    expect(result.wasProcessed).toBe(false);
    expect(result.file).toBe(file);
    expect(result.mimeType).toBe('video/mp4');
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(adapter.createInstance).not.toHaveBeenCalled();
  });

  it('rejects immediately with isAborted when AbortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File(['raw-video'], 'ace.mp4', { type: 'video/mp4' });

    await expect(
      processClipWithFfmpeg({
        file,
        totalDuration: 25,
        settings: createDefaultEditSettings(25, '720p'),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'FfmpegProcessingError', isAborted: true });
  });

  it('encodes clip with 720p preset, emits progress, cleans MEMFS and reuses cached instance', async () => {
    const file = new File(['raw-video'], 'clutch_mirage.webm', { type: 'video/webm' });
    const progressValues: number[] = [];
    const { adapter, loadSpy, execSpy, deleteSpy } = createMockFfmpegAdapter({
      execImpl: async (_args, emit) => {
        emit({ progress: Number.NaN });
        emit({ progress: 0.35 });
        emit({ progress: 1.2 });
        return 0;
      },
    });

    const first = await processClipWithFfmpeg({
      file,
      totalDuration: 30,
      settings: createDefaultEditSettings(30, '720p'),
      onProgress: (p) => progressValues.push(p),
      adapter,
    });

    expect(first.wasProcessed).toBe(true);
    expect(first.mimeType).toBe('video/mp4');
    expect(first.file.name).toBe('clutch_mirage-edited.mp4');
    expect(first.file.size).toBe(6);
    expect(progressValues).toEqual([0, 35, 99, 100]);
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(execSpy).toHaveBeenCalledWith(expect.arrayContaining(["scale=-2:'min(720,ih)'"]));
    expect(deleteSpy).toHaveBeenCalledWith('clipai-in.webm');
    expect(deleteSpy).toHaveBeenCalledWith('clipai-out.mp4');

    // Second invocation reuses cached FFmpeg instance without reloading WASM
    await processClipWithFfmpeg({
      file,
      totalDuration: 30,
      settings: createDefaultEditSettings(30, '480p'),
      adapter,
    });
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('uses fast stream copy for original trimmed clip and falls back to re-encode if copy fails', async () => {
    const file = new File(['raw-video'], 'trimmed.mp4', { type: 'video/mp4' });
    const execCalls: string[][] = [];
    const { adapter } = createMockFfmpegAdapter({
      execImpl: async (args) => {
        execCalls.push(args);
        // Fail fast copy once, succeed on re-encode fallback
        return execCalls.length === 1 ? 1 : 0;
      },
    });

    const result = await processClipWithFfmpeg({
      file,
      totalDuration: 40,
      settings: {
        ...createDefaultEditSettings(40, 'original'),
        startTime: 4,
        endTime: 24,
      },
      adapter,
    });

    expect(result.wasProcessed).toBe(true);
    expect(execCalls).toHaveLength(2);
    expect(execCalls[0]).toContain('copy');
    expect(execCalls[1]).toContain('libx264');
  });

  it('terminates FFmpeg worker and aborts cleanly when cancelled mid-processing', async () => {
    const controller = new AbortController();
    const file = new File(['raw-video'], 'cancel.mp4', { type: 'video/mp4' });
    const { adapter, terminateSpy } = createMockFfmpegAdapter({
      execImpl: async () => {
        controller.abort();
        throw new Error('worker terminated');
      },
    });

    await expect(
      processClipWithFfmpeg({
        file,
        totalDuration: 30,
        settings: createDefaultEditSettings(30, '720p'),
        signal: controller.signal,
        adapter,
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof FfmpegProcessingError && err.isAborted);

    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });

  it('throws friendly PT-BR errors on non-zero exit code or empty output buffer', async () => {
    const file = new File(['raw-video'], 'broken.mp4', { type: 'video/mp4' });
    const failExec = createMockFfmpegAdapter({
      execImpl: async () => 1,
    });

    await expect(
      processClipWithFfmpeg({
        file,
        totalDuration: 20,
        settings: createDefaultEditSettings(20, '720p'),
        adapter: failExec.adapter,
      }),
    ).rejects.toThrow('Não foi possível renderizar o clipe no navegador.');

    resetFfmpegCache();

    const emptyOutput = createMockFfmpegAdapter({
      readFileImpl: async () => new Uint8Array(0),
    });

    await expect(
      processClipWithFfmpeg({
        file,
        totalDuration: 20,
        settings: createDefaultEditSettings(20, '720p'),
        adapter: emptyOutput.adapter,
      }),
    ).rejects.toThrow('O vídeo renderizado resultou vazio.');
  });
});
