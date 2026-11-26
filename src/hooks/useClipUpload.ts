'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { FfmpegProcessingError, processClipWithFfmpeg } from '@/lib/ffmpeg-processor';
import { R2UploadError, uploadFileToPresignedUrl } from '@/lib/r2-upload';
import { validateClipDuration, validateVideoFileMeta } from '@/lib/validators';
import {
  createDefaultEditSettings,
  estimateEditedClipSize,
  getExportPresetOption,
  roundTimeSeconds,
} from '@/lib/video-editor-utils';
import {
  extractVideoMetadataAndThumbnail,
  formatResolutionLabel,
  VideoMetadataError,
  type CapturedThumbnailResult,
} from '@/lib/video-utils';
import { clipsService } from '@/services/clips-service';
import type {
  Clip,
  ClipEditEstimate,
  ClipEditSettings,
  ClipUploadStage,
  ExtractedVideoResult,
  PrivacyLevel,
} from '@/types/clip';

export interface StartUploadPayload {
  title: string;
  description: string;
  gameId: string;
  privacy: PrivacyLevel;
  tags: string[];
}

export interface UseClipUploadResult {
  selectedFile: File | null;
  videoPreviewUrl: string | null;
  extractedMeta: ExtractedVideoResult | null;
  editSettings: ClipEditSettings | null;
  editEstimate: ClipEditEstimate | null;
  isInspecting: boolean;
  inspectionError: string | null;
  stage: ClipUploadStage;
  renderProgress: number;
  videoProgress: number;
  uploadError: string | null;
  uploadedClip: Clip | null;
  selectVideoFile: (file: File) => Promise<void>;
  updateEditSettings: (
    updater: Partial<ClipEditSettings> | ((prev: ClipEditSettings) => ClipEditSettings),
  ) => void;
  updateThumbnailFromCapture: (
    captured: CapturedThumbnailResult,
    capturedAtSeconds: number,
  ) => void;
  startUpload: (payload: StartUploadPayload) => Promise<Clip | null>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  cancelUpload: () => void;
  resetUploadState: () => void;
}

interface PauseGateState {
  isPaused: boolean;
  promise: Promise<void> | null;
  resolve: (() => void) | null;
}

function isAbortedError(err: unknown): boolean {
  return (
    (err instanceof R2UploadError && err.isAborted) ||
    (err instanceof FfmpegProcessingError && err.isAborted)
  );
}

function resolveUploadErrorMessage(err: unknown): string {
  if (
    err instanceof ApiClientError ||
    err instanceof R2UploadError ||
    err instanceof FfmpegProcessingError
  ) {
    return err.message;
  }
  return 'Ocorreu um erro inesperado ao enviar o clipe. Tente novamente.';
}

function buildUploadUrlPayload(params: {
  payload: StartUploadPayload;
  extractedMeta: ExtractedVideoResult;
  activeSettings: ClipEditSettings;
  uploadFile: File;
  uploadMimeType: ExtractedVideoResult['videoMimeType'];
  finalDuration: number;
}) {
  const { payload, extractedMeta, activeSettings, uploadFile, uploadMimeType, finalDuration } =
    params;
  const finalDims = resolveFinalDimensions(extractedMeta, activeSettings);
  const finalBitrateKbps = Math.max(1, Math.round((uploadFile.size * 8) / finalDuration / 1000));
  const finalContainer: 'webm' | 'mp4' = uploadMimeType === 'video/webm' ? 'webm' : 'mp4';

  return {
    title: payload.title.trim(),
    description: payload.description.trim() || null,
    game_id: payload.gameId,
    privacy: payload.privacy,
    tags: payload.tags,
    video_mime_type: uploadMimeType,
    video_size_bytes: uploadFile.size,
    duration_seconds: finalDuration,
    thumbnail_mime_type: extractedMeta.thumbnailMimeType,
    thumbnail_size_bytes: extractedMeta.thumbnailSizeBytes,
    technical_metadata: {
      ...extractedMeta.technicalMetadata,
      container: finalContainer,
      width: finalDims.width,
      height: finalDims.height,
      resolution_label: finalDims.resolutionLabel,
      bitrate_kbps: finalBitrateKbps,
    },
  };
}

function revokeUrl(url: string | null | undefined): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function resolveFinalDimensions(
  meta: ExtractedVideoResult,
  settings: ClipEditSettings,
): { width: number; height: number; resolutionLabel: string } {
  const presetOption = getExportPresetOption(settings.preset);
  if (presetOption.maxHeight === null || meta.height <= presetOption.maxHeight) {
    return {
      width: meta.width,
      height: meta.height,
      resolutionLabel: meta.resolutionLabel,
    };
  }

  const ratio = presetOption.maxHeight / meta.height;
  const scaledWidth = Math.max(2, Math.round((meta.width * ratio) / 2) * 2);
  return {
    width: scaledWidth,
    height: presetOption.maxHeight,
    resolutionLabel: formatResolutionLabel(presetOption.maxHeight),
  };
}

export function useClipUpload(): UseClipUploadResult {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<ExtractedVideoResult | null>(null);
  const [editSettings, setEditSettings] = useState<ClipEditSettings | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  const [stage, setStage] = useState<ClipUploadStage>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedClip, setUploadedClip] = useState<Clip | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseGateRef = useRef<PauseGateState>({
    isPaused: false,
    promise: null,
    resolve: null,
  });
  const latestRenderProgressRef = useRef(0);
  const latestVideoProgressRef = useRef(0);
  const metaRef = useRef<ExtractedVideoResult | null>(null);
  const videoObjectUrlRef = useRef<{ file: File | null; url: string | null }>({
    file: null,
    url: null,
  });
  const selectionRequestIdRef = useRef(0);

  const reportRenderProgress = useCallback((percent: number) => {
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
      return;
    }
    latestRenderProgressRef.current = percent;
    if (!pauseGateRef.current.isPaused) {
      setRenderProgress(percent);
    }
  }, []);

  const reportVideoProgress = useCallback((percent: number) => {
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
      return;
    }
    latestVideoProgressRef.current = percent;
    if (!pauseGateRef.current.isPaused) {
      setVideoProgress(percent);
    }
  }, []);

  const pauseUpload = useCallback(() => {
    const gate = pauseGateRef.current;
    if (gate.isPaused) {
      return;
    }
    gate.isPaused = true;
    gate.promise = new Promise<void>((resolve) => {
      gate.resolve = resolve;
    });
  }, []);

  const resumeUpload = useCallback(() => {
    const gate = pauseGateRef.current;
    if (!gate.isPaused) {
      return;
    }
    gate.isPaused = false;
    const release = gate.resolve;
    gate.promise = null;
    gate.resolve = null;
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      setRenderProgress(latestRenderProgressRef.current);
      setVideoProgress(latestVideoProgressRef.current);
    }
    release?.();
  }, []);

  const waitIfPausedOrAborted = useCallback(async (signal: AbortSignal): Promise<void> => {
    if (signal.aborted) {
      throw new R2UploadError('Envio cancelado pelo usuário.', { isAborted: true });
    }

    const pendingPause = pauseGateRef.current.promise;
    if (!pendingPause) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const handleAbort = () => {
        reject(new R2UploadError('Envio cancelado pelo usuário.', { isAborted: true }));
      };
      signal.addEventListener('abort', handleAbort, { once: true });
      void pendingPause.then(() => {
        signal.removeEventListener('abort', handleAbort);
        if (signal.aborted) {
          reject(new R2UploadError('Envio cancelado pelo usuário.', { isAborted: true }));
        } else {
          resolve();
        }
      });
    });
  }, []);

  useEffect(() => {
    metaRef.current = extractedMeta;
  }, [extractedMeta]);

  const releaseVideoPreviewUrl = useCallback(() => {
    revokeUrl(videoObjectUrlRef.current.url);
    videoObjectUrlRef.current = { file: null, url: null };
  }, []);

  const acquireVideoPreviewUrl = useCallback((file: File): string => {
    if (videoObjectUrlRef.current.file === file && videoObjectUrlRef.current.url) {
      return videoObjectUrlRef.current.url;
    }
    revokeUrl(videoObjectUrlRef.current.url);
    const nextUrl = URL.createObjectURL(file);
    videoObjectUrlRef.current = { file, url: nextUrl };
    return nextUrl;
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      resumeUpload();
      revokeUrl(metaRef.current?.thumbnailPreviewUrl);
      releaseVideoPreviewUrl();
    };
  }, [releaseVideoPreviewUrl, resumeUpload]);

  const editEstimate = useMemo<ClipEditEstimate | null>(() => {
    if (!extractedMeta || !editSettings) {
      return null;
    }
    return estimateEditedClipSize({
      originalBytes: extractedMeta.videoSizeBytes,
      totalDuration: extractedMeta.durationSeconds,
      settings: editSettings,
    });
  }, [extractedMeta, editSettings]);

  const selectVideoFile = useCallback(
    async (file: File) => {
      const requestId = selectionRequestIdRef.current + 1;
      selectionRequestIdRef.current = requestId;

      setIsInspecting(true);
      setInspectionError(null);
      setUploadError(null);
      setStage('idle');
      setRenderProgress(0);
      setVideoProgress(0);
      setUploadedClip(null);
      revokeUrl(metaRef.current?.thumbnailPreviewUrl);
      releaseVideoPreviewUrl();
      setExtractedMeta(null);
      setEditSettings(null);
      setVideoPreviewUrl(null);
      setSelectedFile(null);

      try {
        const metadata = await extractVideoMetadataAndThumbnail(file, { allowExtendedInput: true });
        if (selectionRequestIdRef.current !== requestId) {
          revokeUrl(metadata.thumbnailPreviewUrl);
          return;
        }
        const previewUrl = acquireVideoPreviewUrl(file);
        setSelectedFile(file);
        setVideoPreviewUrl(previewUrl);
        setExtractedMeta(metadata);
        setEditSettings(createDefaultEditSettings(metadata.durationSeconds));
      } catch (err: unknown) {
        if (selectionRequestIdRef.current !== requestId) {
          return;
        }
        const message =
          err instanceof VideoMetadataError
            ? err.message
            : 'Não foi possível validar o arquivo de vídeo selecionado.';
        setInspectionError(message);
      } finally {
        if (selectionRequestIdRef.current === requestId) {
          setIsInspecting(false);
        }
      }
    },
    [acquireVideoPreviewUrl, releaseVideoPreviewUrl],
  );

  const updateEditSettings = useCallback(
    (updater: Partial<ClipEditSettings> | ((prev: ClipEditSettings) => ClipEditSettings)) => {
      setEditSettings((prev) => {
        if (!prev) {
          return prev;
        }
        return typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      });
    },
    [],
  );

  const updateThumbnailFromCapture = useCallback(
    (captured: CapturedThumbnailResult, capturedAtSeconds: number) => {
      revokeUrl(metaRef.current?.thumbnailPreviewUrl);
      setExtractedMeta((prev) => {
        if (!prev) {
          revokeUrl(captured.previewUrl);
          return prev;
        }
        return {
          ...prev,
          thumbnailBlob: captured.blob,
          thumbnailMimeType: captured.mimeType,
          thumbnailSizeBytes: captured.sizeBytes,
          thumbnailPreviewUrl: captured.previewUrl,
        };
      });
      setEditSettings((prev) =>
        prev ? { ...prev, thumbnailTimeSeconds: roundTimeSeconds(capturedAtSeconds) } : prev,
      );
    },
    [],
  );

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    latestRenderProgressRef.current = 0;
    latestVideoProgressRef.current = 0;
    resumeUpload();
  }, [resumeUpload]);

  const resetUploadState = useCallback(() => {
    selectionRequestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    latestRenderProgressRef.current = 0;
    latestVideoProgressRef.current = 0;
    resumeUpload();
    revokeUrl(metaRef.current?.thumbnailPreviewUrl);
    releaseVideoPreviewUrl();
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setExtractedMeta(null);
    setEditSettings(null);
    setIsInspecting(false);
    setInspectionError(null);
    setStage('idle');
    setRenderProgress(0);
    setVideoProgress(0);
    setUploadError(null);
    setUploadedClip(null);
  }, [releaseVideoPreviewUrl, resumeUpload]);

  const startUpload = useCallback(
    async (payload: StartUploadPayload): Promise<Clip | null> => {
      if (!selectedFile || !extractedMeta) {
        setUploadError('Selecione um arquivo de vídeo válido antes de enviar.');
        return null;
      }

      const activeSettings =
        editSettings ?? createDefaultEditSettings(extractedMeta.durationSeconds);
      const finalDuration = roundTimeSeconds(activeSettings.endTime - activeSettings.startTime);
      const durationCheck = validateClipDuration(finalDuration);
      if (!durationCheck.valid) {
        setUploadError(durationCheck.errorMessage ?? 'Duração do corte fora do limite permitido.');
        setStage('error');
        return null;
      }

      latestRenderProgressRef.current = 0;
      latestVideoProgressRef.current = 0;
      resumeUpload();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setUploadError(null);
      setRenderProgress(0);
      setVideoProgress(0);

      try {
        await waitIfPausedOrAborted(controller.signal);
        setStage('rendering');
        const processed = await processClipWithFfmpeg({
          file: selectedFile,
          totalDuration: extractedMeta.durationSeconds,
          settings: activeSettings,
          onProgress: reportRenderProgress,
          signal: controller.signal,
        });
        await waitIfPausedOrAborted(controller.signal);

        const uploadFile = processed.file;
        const uploadMimeType = processed.mimeType;

        const finalMetaCheck = validateVideoFileMeta({
          type: uploadMimeType,
          size: uploadFile.size,
        });
        if (!finalMetaCheck.valid) {
          setUploadError(
            'O vídeo final ultrapassou 100 MB. Reduza o trecho selecionado ou escolha o preset 480p Leve.',
          );
          setStage('error');
          return null;
        }

        setStage('preparing');
        const presigned = await clipsService.requestUploadUrl(
          buildUploadUrlPayload({
            payload,
            extractedMeta,
            activeSettings,
            uploadFile,
            uploadMimeType,
            finalDuration,
          }),
        );
        await waitIfPausedOrAborted(controller.signal);

        setStage('uploading_video');
        await uploadFileToPresignedUrl(
          presigned.video_upload.url,
          uploadFile,
          presigned.video_upload.headers['Content-Type'] || uploadMimeType,
          reportVideoProgress,
          controller.signal,
        );
        await waitIfPausedOrAborted(controller.signal);

        if (presigned.thumbnail_upload) {
          setStage('uploading_thumbnail');
          await uploadFileToPresignedUrl(
            presigned.thumbnail_upload.url,
            extractedMeta.thumbnailBlob,
            presigned.thumbnail_upload.headers['Content-Type'] || extractedMeta.thumbnailMimeType,
            () => undefined,
            controller.signal,
          );
          await waitIfPausedOrAborted(controller.signal);
        }

        setStage('confirming');
        const confirmedClip = await clipsService.confirmUpload(presigned.clip_id);
        await waitIfPausedOrAborted(controller.signal);

        setUploadedClip(confirmedClip);
        setStage('success');
        return confirmedClip;
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortedError(err)) {
          latestRenderProgressRef.current = 0;
          latestVideoProgressRef.current = 0;
          setStage('idle');
          setRenderProgress(0);
          setVideoProgress(0);
          return null;
        }

        setUploadError(resolveUploadErrorMessage(err));
        setStage('error');
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      selectedFile,
      extractedMeta,
      editSettings,
      reportRenderProgress,
      reportVideoProgress,
      resumeUpload,
      waitIfPausedOrAborted,
    ],
  );

  return {
    selectedFile,
    videoPreviewUrl,
    extractedMeta,
    editSettings,
    editEstimate,
    isInspecting,
    inspectionError,
    stage,
    renderProgress,
    videoProgress,
    uploadError,
    uploadedClip,
    selectVideoFile,
    updateEditSettings,
    updateThumbnailFromCapture,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    resetUploadState,
  };
}
