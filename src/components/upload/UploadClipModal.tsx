'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, UploadCloud, X } from 'lucide-react';
import { ClipVideoEditor } from '@/components/upload/ClipVideoEditor';
import { PrivacySelector } from '@/components/upload/PrivacySelector';
import { TagsChipInput } from '@/components/upload/TagsChipInput';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useClipUpload } from '@/hooks/useClipUpload';
import { validateClipDescription, validateClipTitle } from '@/lib/validators';
import { clipsService } from '@/services/clips-service';
import {
  getClipShareSlug,
  type Clip,
  type ClipEditEstimate,
  type ClipEditSettings,
  type ClipUploadStage,
  type ExtractedVideoResult,
  type Game,
  type PrivacyLevel,
} from '@/types/clip';
import type { CapturedThumbnailResult } from '@/lib/video-utils';

export interface UploadClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (clip: Clip) => void;
}

interface FormErrors {
  file?: string;
  title?: string;
  description?: string;
  gameId?: string;
}

function getStageStatusLabel(
  stage: ClipUploadStage,
  renderProgress: number,
  videoProgress: number,
): string {
  switch (stage) {
    case 'rendering':
      return `Renderizando clipe no navegador (${renderProgress}%)`;
    case 'preparing':
      return 'Preparando envio...';
    case 'uploading_video':
      return `Enviando vídeo para o R2 (${videoProgress}%)`;
    case 'uploading_thumbnail':
      return 'Enviando thumbnail...';
    case 'confirming':
      return 'Finalizando...';
    default:
      return '';
  }
}

function getUploadProgressPercent(
  stage: ClipUploadStage,
  renderProgress: number,
  videoProgress: number,
): number {
  switch (stage) {
    case 'rendering':
      return Math.max(2, renderProgress);
    case 'preparing':
      return 5;
    case 'uploading_video':
      return Math.max(8, Math.round(videoProgress * 0.85));
    case 'uploading_thumbnail':
      return 92;
    case 'confirming':
      return 98;
    default:
      return 100;
  }
}

function isActiveUploadStage(stage: ClipUploadStage): boolean {
  return (
    stage === 'rendering' ||
    stage === 'preparing' ||
    stage === 'uploading_video' ||
    stage === 'uploading_thumbnail' ||
    stage === 'confirming'
  );
}

function resolveNextTitleOnFilePick(currentTitle: string, fileName: string): string {
  if (currentTitle.trim()) {
    return currentTitle;
  }
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  return baseName.length >= 3 ? baseName.slice(0, 120) : currentTitle;
}

function buildUploadFormErrors(params: {
  hasValidMedia: boolean;
  title: string;
  description: string;
  gameId: string;
}): FormErrors {
  const nextErrors: FormErrors = {};
  if (!params.hasValidMedia) {
    nextErrors.file = 'Selecione um vídeo MP4 ou WebM válido para continuar.';
  }

  const titleCheck = validateClipTitle(params.title);
  if (!titleCheck.valid && titleCheck.errorMessage) {
    nextErrors.title = titleCheck.errorMessage;
  }

  const descCheck = validateClipDescription(params.description);
  if (!descCheck.valid && descCheck.errorMessage) {
    nextErrors.description = descCheck.errorMessage;
  }

  if (!params.gameId) {
    nextErrors.gameId = 'Selecione o jogo do clipe.';
  }

  return nextErrors;
}

async function fetchAvailableGames(): Promise<Game[]> {
  try {
    const res = await clipsService.listGames({ page_size: 50 });
    return res.items;
  } catch {
    return [];
  }
}

function useAvailableGames(isOpen: boolean): { games: Game[]; isLoadingGames: boolean } {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isActive = true;
    setIsLoadingGames(true);
    void fetchAvailableGames().then((items) => {
      if (isActive) {
        setGames(items);
        setIsLoadingGames(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [isOpen]);

  return { games, isLoadingGames };
}

function getDropzoneContainerClass(
  hasReadyEditor: boolean,
  isDragging: boolean,
  hasFileError: boolean,
): string {
  return hasReadyEditor
    ? `rounded-card transition-colors ${isDragging ? 'ring-2 ring-success' : ''}`
    : `rounded-card border-[1.5px] border-dashed p-4 transition-colors ${
        isDragging
          ? 'border-success bg-bg-elevated'
          : hasFileError
            ? 'border-danger bg-bg-deep'
            : 'border-border-muted bg-bg-deep'
      }`;
}

interface UploadSuccessPanelProps {
  uploadedClip: Clip;
  onClose: () => void;
}

function UploadSuccessPanel({ uploadedClip, onClose }: Readonly<UploadSuccessPanelProps>) {
  return (
    <div className="space-y-5 py-2">
      <div className="flex items-start gap-3 rounded-card border border-success bg-success-surface p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1 font-mono text-mono-body text-text-primary">
          <p className="font-semibold">Seu clipe está no ar!</p>
          <p className="break-words text-mono-meta">
            <strong className="break-words">{uploadedClip.title}</strong> foi processado e já pode
            ser reproduzido e compartilhado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href={`/c/${getClipShareSlug(uploadedClip)}`} className="block">
          <Button type="button" variant="primary" fullWidth>
            IR PARA O CLIPE
          </Button>
        </Link>
        <Button type="button" variant="secondary" fullWidth onClick={onClose}>
          Fechar e atualizar lista
        </Button>
      </div>
    </div>
  );
}

interface UploadDropzoneSectionProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  videoPreviewUrl: string | null;
  extractedMeta: ExtractedVideoResult | null;
  editSettings: ClipEditSettings | null;
  editEstimate: ClipEditEstimate | null;
  isInspecting: boolean;
  isUploading: boolean;
  isDragging: boolean;
  inspectionError: string | null;
  fileError?: string;
  onSetDragging: (dragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpdateEditSettings: (
    updater: Partial<ClipEditSettings> | ((prev: ClipEditSettings) => ClipEditSettings),
  ) => void;
  onCaptureThumbnail: (captured: CapturedThumbnailResult, capturedAtSeconds: number) => void;
}

function UploadDropzoneSection({
  fileInputRef,
  selectedFile,
  videoPreviewUrl,
  extractedMeta,
  editSettings,
  editEstimate,
  isInspecting,
  isUploading,
  isDragging,
  inspectionError,
  fileError,
  onSetDragging,
  onDrop,
  onFileInputChange,
  onUpdateEditSettings,
  onCaptureThumbnail,
}: Readonly<UploadDropzoneSectionProps>) {
  const activeFileError = inspectionError ?? fileError;
  const hasReadyEditor = Boolean(extractedMeta && !isInspecting);
  const canRenderEditor = Boolean(
    !isInspecting &&
    extractedMeta &&
    selectedFile &&
    videoPreviewUrl &&
    editSettings &&
    editEstimate,
  );

  return (
    <>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploading) onSetDragging(true);
        }}
        onDragLeave={() => onSetDragging(false)}
        onDrop={onDrop}
        className={getDropzoneContainerClass(hasReadyEditor, isDragging, Boolean(activeFileError))}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          onChange={onFileInputChange}
          disabled={isUploading}
          data-testid="clip-file-input"
          className="sr-only"
        />

        {isInspecting && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-warning" aria-hidden="true" />
            <p className="font-mono text-mono-body text-text-primary">
              Analisando vídeo e capturando thumbnail...
            </p>
          </div>
        )}

        {canRenderEditor &&
          extractedMeta &&
          selectedFile &&
          videoPreviewUrl &&
          editSettings &&
          editEstimate && (
            <ClipVideoEditor
              fileName={selectedFile.name}
              videoPreviewUrl={videoPreviewUrl}
              extractedMeta={extractedMeta}
              editSettings={editSettings}
              editEstimate={editEstimate}
              disabled={isUploading}
              onChangeFileClick={() => fileInputRef.current?.click()}
              onUpdateEditSettings={onUpdateEditSettings}
              onCaptureThumbnail={onCaptureThumbnail}
            />
          )}

        {!isInspecting && !extractedMeta && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <UploadCloud className="h-9 w-9 text-text-muted" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-mono text-mono-body text-text-primary">
                Arraste seu clipe aqui ou selecione do computador
              </p>
              <p className="font-mono text-mono-meta text-text-muted">
                Formatos: .mp4 ou .webm • Máx. 100 MB • Máx. 120 segundos
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar vídeo
            </Button>
          </div>
        )}
      </div>

      {activeFileError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words">{activeFileError}</span>
        </div>
      )}
    </>
  );
}

interface UploadMetadataFieldsProps {
  title: string;
  description: string;
  gameId: string;
  tags: string[];
  privacy: PrivacyLevel;
  games: Game[];
  isLoadingGames: boolean;
  isUploading: boolean;
  formErrors: FormErrors;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeGameId: (value: string) => void;
  onChangeTags: (tags: string[]) => void;
  onChangePrivacy: (privacy: PrivacyLevel) => void;
}

function UploadMetadataFields({
  title,
  description,
  gameId,
  tags,
  privacy,
  games,
  isLoadingGames,
  isUploading,
  formErrors,
  onChangeTitle,
  onChangeDescription,
  onChangeGameId,
  onChangeTags,
  onChangePrivacy,
}: Readonly<UploadMetadataFieldsProps>) {
  return (
    <>
      <Input
        label="Título do clipe"
        name="title"
        placeholder="Ex: Clutch 1v4 de AWP na Mirage"
        value={title}
        onChange={(event) => onChangeTitle(event.target.value)}
        error={formErrors.title}
        disabled={isUploading}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="clip-description-input"
          className="block font-mono text-mono-meta font-medium text-text-secondary"
        >
          Descrição (opcional)
        </label>
        <textarea
          id="clip-description-input"
          rows={3}
          value={description}
          disabled={isUploading}
          onChange={(event) => onChangeDescription(event.target.value)}
          placeholder="Conte o contexto da jogada..."
          className="w-full rounded-control border border-border-muted bg-bg-elevated p-3 font-mono text-mono-body text-text-primary placeholder:text-text-muted focus:border-success focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {formErrors.description && (
          <p role="alert" className="font-mono text-mono-meta text-danger-text">
            {formErrors.description}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="clip-game-select"
          className="block font-mono text-mono-meta font-medium text-text-secondary"
        >
          Jogo
        </label>
        <select
          id="clip-game-select"
          value={gameId}
          disabled={isUploading || isLoadingGames}
          onChange={(event) => onChangeGameId(event.target.value)}
          className="h-11 w-full rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-body text-text-primary focus:border-success focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{isLoadingGames ? 'Carregando jogos...' : 'Selecione o jogo'}</option>
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
        {formErrors.gameId && (
          <p role="alert" className="font-mono text-mono-meta text-danger-text">
            {formErrors.gameId}
          </p>
        )}
      </div>

      <TagsChipInput tags={tags} onChange={onChangeTags} disabled={isUploading} />

      <PrivacySelector value={privacy} onChange={onChangePrivacy} disabled={isUploading} />
    </>
  );
}

interface UploadProgressPanelProps {
  isRendering: boolean;
  stageLabel: string;
  progressPercent: number;
}

function UploadProgressPanel({
  isRendering,
  stageLabel,
  progressPercent,
}: Readonly<UploadProgressPanelProps>) {
  return (
    <div
      aria-live="polite"
      data-testid={isRendering ? 'render-progress-panel' : 'upload-progress-panel'}
      className="space-y-2 rounded-card border border-border-muted bg-bg-deep p-4"
    >
      <div className="flex items-center justify-between font-mono text-mono-meta">
        <span className="font-semibold text-text-primary">{stageLabel}</span>
        <span className={isRendering ? 'text-warning' : 'text-success'}>{progressPercent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface">
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full transition-all duration-150 ${
            isRendering ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="font-mono text-mono-badge text-text-muted">
        {isRendering
          ? 'Etapa 1 de 2: Otimizando e cortando no navegador antes do envio.'
          : 'Etapa 2 de 2: Enviando mídia direto para o Cloudflare R2.'}
      </p>
    </div>
  );
}

interface UploadModalFooterProps {
  isRendering: boolean;
  isUploading: boolean;
  isInspecting: boolean;
  exceedsMaxSize: boolean;
  stageLabel: string;
  onCancel: () => void;
}

function UploadModalFooter({
  isRendering,
  isUploading,
  isInspecting,
  exceedsMaxSize,
  stageLabel,
  onCancel,
}: Readonly<UploadModalFooterProps>) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="secondary" onClick={onCancel}>
        {isRendering ? 'Cancelar renderização' : isUploading ? 'Cancelar envio' : 'Cancelar'}
      </Button>
      <Button
        type="submit"
        variant="primary"
        disabled={isInspecting || exceedsMaxSize}
        isLoading={isUploading}
        loadingText={stageLabel || 'ENVIANDO...'}
      >
        PUBLICAR CLIPE
      </Button>
    </div>
  );
}

export function UploadClipModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: Readonly<UploadClipModalProps>) {
  const { success } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
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
    cancelUpload,
    resetUploadState,
  } = useClipUpload();

  const { games, isLoadingGames } = useAvailableGames(isOpen);
  const [isDragging, setIsDragging] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameId, setGameId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  if (!isOpen) {
    return null;
  }

  const isRendering = stage === 'rendering';
  const isUploading = isActiveUploadStage(stage);

  const handleClose = () => {
    if (isUploading) {
      cancelUpload();
    }
    resetUploadState();
    setTitle('');
    setDescription('');
    setGameId('');
    setTags([]);
    setPrivacy('public');
    setFormErrors({});
    onClose();
  };

  const handleFilePicked = (file: File | undefined) => {
    if (!file) {
      return;
    }
    setFormErrors((prev) => ({ ...prev, file: undefined }));
    setTitle((prev) => resolveNextTitleOnFilePick(prev, file.name));
    void selectVideoFile(file);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFilePicked(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) {
      handleFilePicked(event.dataTransfer.files[0]);
    }
  };

  const executeUpload = async () => {
    const nextErrors = buildUploadFormErrors({
      hasValidMedia: Boolean(selectedFile && extractedMeta),
      title,
      description,
      gameId,
    });
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const created = await startUpload({
      title,
      description,
      gameId,
      privacy,
      tags,
    });

    if (created) {
      success('Clipe enviado e publicado com sucesso!');
      onUploadSuccess?.(created);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void executeUpload();
  };

  const stageLabel = getStageStatusLabel(stage, renderProgress, videoProgress);
  const progressPercent = getUploadProgressPercent(stage, renderProgress, videoProgress);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-sm"
    >
      <div className="custom-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4 text-text-primary shadow-2xl sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-3 border-b border-border-muted pb-4 sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <BrandLogo variant="icon" size="xs" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="upload-modal-title"
                className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary"
              >
                ENVIAR CLIPE
              </h2>
              <p className="break-words font-mono text-mono-meta text-text-secondary">
                Upload direto para o Cloudflare R2 • MP4 ou WebM até 100 MB e 120s
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar modal de upload"
            className="shrink-0 rounded-control p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {stage === 'success' && uploadedClip ? (
          <UploadSuccessPanel uploadedClip={uploadedClip} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <UploadDropzoneSection
              fileInputRef={fileInputRef}
              selectedFile={selectedFile}
              videoPreviewUrl={videoPreviewUrl}
              extractedMeta={extractedMeta}
              editSettings={editSettings}
              editEstimate={editEstimate}
              isInspecting={isInspecting}
              isUploading={isUploading}
              isDragging={isDragging}
              inspectionError={inspectionError}
              fileError={formErrors.file}
              onSetDragging={setIsDragging}
              onDrop={handleDrop}
              onFileInputChange={handleFileInputChange}
              onUpdateEditSettings={updateEditSettings}
              onCaptureThumbnail={updateThumbnailFromCapture}
            />

            <UploadMetadataFields
              title={title}
              description={description}
              gameId={gameId}
              tags={tags}
              privacy={privacy}
              games={games}
              isLoadingGames={isLoadingGames}
              isUploading={isUploading}
              formErrors={formErrors}
              onChangeTitle={setTitle}
              onChangeDescription={setDescription}
              onChangeGameId={setGameId}
              onChangeTags={setTags}
              onChangePrivacy={setPrivacy}
            />

            {isUploading && (
              <UploadProgressPanel
                isRendering={isRendering}
                stageLabel={stageLabel}
                progressPercent={progressPercent}
              />
            )}

            {stage === 'error' && uploadError && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-card border border-danger bg-danger-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2 font-mono text-mono-meta text-danger-text">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-words">{uploadError}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => void executeUpload()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            <UploadModalFooter
              isRendering={isRendering}
              isUploading={isUploading}
              isInspecting={isInspecting}
              exceedsMaxSize={Boolean(editEstimate?.exceedsMaxSize)}
              stageLabel={stageLabel}
              onCancel={handleClose}
            />
          </form>
        )}
      </div>
    </div>
  );
}
