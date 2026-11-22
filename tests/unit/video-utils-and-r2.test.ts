import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { R2UploadError, uploadFileToPresignedUrl } from '@/lib/r2-upload';
import {
  VideoMetadataError,
  computeAspectRatio,
  computeTargetThumbnailSize,
  extractContainerFromMime,
  extractVideoMetadataAndThumbnail,
  formatResolutionLabel,
} from '@/lib/video-utils';

describe('video-utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes resolution labels, aspect ratios and scaled thumbnail dimensions', () => {
    expect(formatResolutionLabel(2160)).toBe('2160p');
    expect(formatResolutionLabel(1440)).toBe('1440p');
    expect(formatResolutionLabel(1080)).toBe('1080p');
    expect(formatResolutionLabel(720)).toBe('720p');
    expect(formatResolutionLabel(480)).toBe('480p');
    expect(formatResolutionLabel(360)).toBe('360p');
    expect(formatResolutionLabel(0)).toBe('720p');

    expect(computeAspectRatio(1920, 1080)).toBe('16:9');
    expect(computeAspectRatio(1440, 1080)).toBe('4:3');
    expect(computeAspectRatio(0, 0)).toBe('16:9');

    expect(computeTargetThumbnailSize(1920, 1080, 1280)).toEqual({ width: 1280, height: 720 });
    expect(computeTargetThumbnailSize(854, 480, 1280)).toEqual({ width: 854, height: 480 });
    expect(computeTargetThumbnailSize(0, 0, 1280)).toEqual({ width: 1280, height: 720 });

    expect(extractContainerFromMime('video/mp4')).toBe('mp4');
    expect(extractContainerFromMime('video/webm')).toBe('webm');
  });

  it('rejects unsupported MIME types or oversized files before creating object URLs', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL');

    const badTypeFile = new File(['abc'], 'clip.avi', { type: 'video/avi' });
    await expect(extractVideoMetadataAndThumbnail(badTypeFile)).rejects.toThrow(
      'Formato não suportado. Envie apenas arquivos MP4 ou WebM.',
    );

    const hugeFile = new File(['abc'], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(hugeFile, 'size', { value: 105_000_000 });
    await expect(extractVideoMetadataAndThumbnail(hugeFile)).rejects.toThrow(
      'O arquivo excede o limite máximo de 100 MB.',
    );

    expect(createUrlSpy).not.toHaveBeenCalled();
  });

  it('extracts video metadata, draws canvas thumbnail and revokes object URL', async () => {
    const createUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:video-temp-url')
      .mockReturnValueOnce('blob:thumb-preview-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const drawImageMock = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: drawImageMock }),
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
        cb(new Blob(['webp-bytes'], { type: 'image/webp' }));
      }),
    } as unknown as HTMLCanvasElement;

    const fakeVideo = {
      preload: '',
      muted: false,
      playsInline: false,
      duration: 34.5,
      videoWidth: 1920,
      videoHeight: 1080,
      currentTime: 0,
      src: '',
      load: vi.fn(),
      removeAttribute: vi.fn(),
      listeners: new Map<string, Array<() => void>>(),
      addEventListener(eventName: string, cb: () => void) {
        const list = this.listeners.get(eventName) ?? [];
        list.push(cb);
        this.listeners.set(eventName, list);
      },
      removeEventListener(eventName: string, cb: () => void) {
        const list = this.listeners.get(eventName) ?? [];
        this.listeners.set(
          eventName,
          list.filter((fn) => fn !== cb),
        );
      },
      emit(eventName: string) {
        const list = this.listeners.get(eventName) ?? [];
        list.forEach((fn) => fn());
      },
    };

    Object.defineProperty(fakeVideo, 'currentTime', {
      set() {
        queueMicrotask(() => fakeVideo.emit('seeked'));
      },
      get() {
        return 1;
      },
    });
    fakeVideo.load = vi.fn(() => {
      if (fakeVideo.src) {
        queueMicrotask(() => fakeVideo.emit('loadedmetadata'));
      }
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') return fakeVideo as unknown as HTMLVideoElement;
      if (tagName === 'canvas') return fakeCanvas;
      return originalCreateElement(tagName);
    });

    const file = new File([new Uint8Array(4096)], 'clutch.mp4', { type: 'video/mp4' });
    const result = await extractVideoMetadataAndThumbnail(file);

    expect(createUrlSpy).toHaveBeenCalledTimes(2);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:video-temp-url');
    expect(drawImageMock).toHaveBeenCalled();
    expect(result.durationSeconds).toBe(34.5);
    expect(result.resolutionLabel).toBe('1080p');
    expect(result.aspectRatio).toBe('16:9');
    expect(result.thumbnailMimeType).toBe('image/webp');
    expect(result.thumbnailPreviewUrl).toBe('blob:thumb-preview-url');
  });

  it('rejects clips exceeding 120s duration and still revokes object URL', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:long-video-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const fakeVideo = {
      preload: '',
      muted: false,
      playsInline: false,
      duration: 145,
      videoWidth: 1920,
      videoHeight: 1080,
      src: '',
      listeners: new Map<string, Array<() => void>>(),
      addEventListener(eventName: string, cb: () => void) {
        const list = this.listeners.get(eventName) ?? [];
        list.push(cb);
        this.listeners.set(eventName, list);
      },
      removeEventListener() {
        // noop
      },
      load() {
        if (this.src) {
          queueMicrotask(() => {
            (this.listeners.get('loadedmetadata') ?? []).forEach((fn) => fn());
          });
        }
      },
      removeAttribute() {
        this.src = '';
      },
    };

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') return fakeVideo as unknown as HTMLVideoElement;
      return originalCreateElement(tagName);
    });

    const file = new File(['video-bytes'], 'long.mp4', { type: 'video/mp4' });
    await expect(extractVideoMetadataAndThumbnail(file)).rejects.toBeInstanceOf(VideoMetadataError);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:long-video-url');
  });
});

describe('r2-upload', () => {
  interface MockXhrInstance {
    open: ReturnType<typeof vi.fn>;
    setRequestHeader: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
    withCredentials: boolean;
    status: number;
    upload: { onprogress: ((event: ProgressEvent) => void) | null };
    onload: (() => void) | null;
    onerror: (() => void) | null;
    onabort: (() => void) | null;
    ontimeout: (() => void) | null;
  }

  let latestXhr: MockXhrInstance;

  beforeEach(() => {
    class MockXMLHttpRequest implements MockXhrInstance {
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn();
      abort = vi.fn(() => {
        this.onabort?.();
      });
      withCredentials = false;
      status = 200;
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      ontimeout: (() => void) | null = null;

      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        latestXhr = this;
      }
    }

    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads via PUT without withCredentials, sets Content-Type and reports progress', async () => {
    const progressCalls: number[] = [];
    const blob = new Blob(['video-data'], { type: 'video/mp4' });

    const uploadPromise = uploadFileToPresignedUrl(
      'https://r2.example.com/presigned',
      blob,
      'video/mp4',
      (percent) => progressCalls.push(percent),
    );

    expect(latestXhr.open).toHaveBeenCalledWith('PUT', 'https://r2.example.com/presigned', true);
    expect(latestXhr.withCredentials).toBe(false);
    expect(latestXhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');

    latestXhr.upload.onprogress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    } as ProgressEvent);

    latestXhr.status = 200;
    latestXhr.onload?.();

    await expect(uploadPromise).resolves.toBeUndefined();
    expect(progressCalls).toEqual([50, 100]);
  });

  it('rejects with R2UploadError on non-2xx status and network errors', async () => {
    const blob = new Blob(['video-data'], { type: 'video/mp4' });

    const statusFailPromise = uploadFileToPresignedUrl(
      'https://r2.example.com/presigned',
      blob,
      'video/mp4',
      () => undefined,
    );
    latestXhr.status = 403;
    latestXhr.onload?.();

    await expect(statusFailPromise).rejects.toMatchObject({
      name: 'R2UploadError',
      status: 403,
    });

    const netFailPromise = uploadFileToPresignedUrl(
      'https://r2.example.com/presigned',
      blob,
      'video/mp4',
      () => undefined,
    );
    latestXhr.onerror?.();

    await expect(netFailPromise).rejects.toBeInstanceOf(R2UploadError);
  });

  it('aborts upload cleanly via AbortSignal', async () => {
    const controller = new AbortController();
    const blob = new Blob(['video-data'], { type: 'video/mp4' });

    const promise = uploadFileToPresignedUrl(
      'https://r2.example.com/presigned',
      blob,
      'video/mp4',
      () => undefined,
      controller.signal,
    );

    controller.abort();
    await expect(promise).rejects.toMatchObject({
      name: 'R2UploadError',
      isAborted: true,
    });

    await expect(
      uploadFileToPresignedUrl(
        'https://r2.example.com/presigned',
        blob,
        'video/mp4',
        () => undefined,
        controller.signal,
      ),
    ).rejects.toMatchObject({ isAborted: true });
  });
});
