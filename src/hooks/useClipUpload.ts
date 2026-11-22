'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { R2UploadError, uploadFileToPresignedUrl } from '@/lib/r2-upload';
import { extractVideoMetadataAndThumbnail, VideoMetadataError } from '@/lib/video-utils';
import { clipsService } from '@/services/clips-service';
import type { Clip, ClipUploadStage, ExtractedVideoResult, PrivacyLevel } from '@/types/clip';

export interface StartUploadPayload {
  title: string;
  description: string;
  gameId: string;
  privacy: PrivacyLevel;
  tags: string[];
}

export interface UseClipUploadResult {
  selectedFile: File | null;
  extractedMeta: ExtractedVideoResult | null;
  isInspecting: boolean;
  inspectionError: string | null;
  stage: ClipUploadStage;
  videoProgress: number;
  uploadError: string | null;
  uploadedClip: Clip | null;
  selectVideoFile: (file: File) => Promise<void>;
  startUpload: (payload: StartUploadPayload) => Promise<Clip | null>;
  cancelUpload: () => void;
  resetUploadState: () => void;
}

function revokePreviewUrl(meta: ExtractedVideoResult | null): void {
  if (meta?.thumbnailPreviewUrl) {
    URL.revokeObjectURL(meta.thumbnailPreviewUrl);
  }
}

export function useClipUpload(): UseClipUploadResult {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<ExtractedVideoResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  const [stage, setStage] = useState<ClipUploadStage>('idle');
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedClip, setUploadedClip] = useState<Clip | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const metaRef = useRef<ExtractedVideoResult | null>(null);

  useEffect(() => {
    metaRef.current = extractedMeta;
  }, [extractedMeta]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      revokePreviewUrl(metaRef.current);
    };
  }, []);

  const selectVideoFile = useCallback(async (file: File) => {
    setIsInspecting(true);
    setInspectionError(null);
    setUploadError(null);
    setStage('idle');
    setVideoProgress(0);
    setUploadedClip(null);
    revokePreviewUrl(metaRef.current);
    setExtractedMeta(null);
    setSelectedFile(null);

    try {
      const metadata = await extractVideoMetadataAndThumbnail(file);
      setSelectedFile(file);
      setExtractedMeta(metadata);
    } catch (err: unknown) {
      const message =
        err instanceof VideoMetadataError
          ? err.message
          : 'Não foi possível validar o arquivo de vídeo selecionado.';
      setInspectionError(message);
    } finally {
      setIsInspecting(false);
    }
  }, []);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const resetUploadState = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    revokePreviewUrl(metaRef.current);
    setSelectedFile(null);
    setExtractedMeta(null);
    setIsInspecting(false);
    setInspectionError(null);
    setStage('idle');
    setVideoProgress(0);
    setUploadError(null);
    setUploadedClip(null);
  }, []);

  const startUpload = useCallback(
    async (payload: StartUploadPayload): Promise<Clip | null> => {
      if (!selectedFile || !extractedMeta) {
        setUploadError('Selecione um arquivo de vídeo válido antes de enviar.');
        return null;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setUploadError(null);
      setVideoProgress(0);
      setStage('preparing');

      try {
        const presigned = await clipsService.requestUploadUrl({
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          game_id: payload.gameId,
          privacy: payload.privacy,
          tags: payload.tags,
          video_mime_type: extractedMeta.videoMimeType,
          video_size_bytes: extractedMeta.videoSizeBytes,
          duration_seconds: extractedMeta.durationSeconds,
          thumbnail_mime_type: extractedMeta.thumbnailMimeType,
          thumbnail_size_bytes: extractedMeta.thumbnailSizeBytes,
          technical_metadata: extractedMeta.technicalMetadata,
        });

        setStage('uploading_video');
        await uploadFileToPresignedUrl(
          presigned.video_upload.url,
          selectedFile,
          presigned.video_upload.headers['Content-Type'] || extractedMeta.videoMimeType,
          (percent) => setVideoProgress(percent),
          controller.signal,
        );

        if (presigned.thumbnail_upload) {
          setStage('uploading_thumbnail');
          await uploadFileToPresignedUrl(
            presigned.thumbnail_upload.url,
            extractedMeta.thumbnailBlob,
            presigned.thumbnail_upload.headers['Content-Type'] || extractedMeta.thumbnailMimeType,
            () => undefined,
            controller.signal,
          );
        }

        setStage('confirming');
        const confirmedClip = await clipsService.confirmUpload(presigned.clip_id);
        setUploadedClip(confirmedClip);
        setStage('success');
        return confirmedClip;
      } catch (err: unknown) {
        if (err instanceof R2UploadError && err.isAborted) {
          setStage('idle');
          setVideoProgress(0);
          return null;
        }

        const message =
          err instanceof ApiClientError || err instanceof R2UploadError
            ? err.message
            : 'Ocorreu um erro inesperado ao enviar o clipe. Tente novamente.';
        setUploadError(message);
        setStage('error');
        return null;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [selectedFile, extractedMeta],
  );

  return {
    selectedFile,
    extractedMeta,
    isInspecting,
    inspectionError,
    stage,
    videoProgress,
    uploadError,
    uploadedClip,
    selectVideoFile,
    startUpload,
    cancelUpload,
    resetUploadState,
  };
}
