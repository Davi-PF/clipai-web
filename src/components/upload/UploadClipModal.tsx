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
import { AlertCircle, CheckCircle2, Film, Loader2, RotateCcw, UploadCloud, X } from 'lucide-react';
import { PrivacySelector } from '@/components/upload/PrivacySelector';
import { TagsChipInput } from '@/components/upload/TagsChipInput';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/toast-context';
import { useClipUpload } from '@/hooks/useClipUpload';
import {
  formatDurationBadge,
  formatFileSizeMb,
  validateClipDescription,
  validateClipTitle,
} from '@/lib/validators';
import { clipsService } from '@/services/clips-service';
import type { Clip, ClipUploadStage, Game, PrivacyLevel } from '@/types/clip';

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

function getStageStatusLabel(stage: ClipUploadStage, videoProgress: number): string {
  switch (stage) {
    case 'preparing':
      return 'Preparando...';
    case 'uploading_video':
      return `Enviando vídeo (${videoProgress}%)`;
    case 'uploading_thumbnail':
      return 'Enviando thumbnail...';
    case 'confirming':
      return 'Finalizando...';
    default:
      return '';
  }
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
  } = useClipUpload();

  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameId, setGameId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isActive = true;
    async function loadGames() {
      setIsLoadingGames(true);
      try {
        const res = await clipsService.listGames({ page_size: 50 });
        if (isActive) {
          setGames(res.items);
        }
      } catch {
        if (isActive) {
          setGames([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingGames(false);
        }
      }
    }

    void loadGames();
    return () => {
      isActive = false;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isUploading =
    stage === 'preparing' ||
    stage === 'uploading_video' ||
    stage === 'uploading_thumbnail' ||
    stage === 'confirming';

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
    if (!title.trim()) {
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      if (baseName.length >= 3) {
        setTitle(baseName.slice(0, 120));
      }
    }
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

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!selectedFile || !extractedMeta) {
      nextErrors.file = 'Selecione um vídeo MP4 ou WebM válido para continuar.';
    }

    const titleCheck = validateClipTitle(title);
    if (!titleCheck.valid && titleCheck.errorMessage) {
      nextErrors.title = titleCheck.errorMessage;
    }

    const descCheck = validateClipDescription(description);
    if (!descCheck.valid && descCheck.errorMessage) {
      nextErrors.description = descCheck.errorMessage;
    }

    if (!gameId) {
      nextErrors.gameId = 'Selecione o jogo do clipe.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const executeUpload = async () => {
    if (!validateForm()) {
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

  const stageLabel = getStageStatusLabel(stage, videoProgress);
  const progressPercent =
    stage === 'preparing'
      ? 5
      : stage === 'uploading_video'
        ? Math.max(8, Math.round(videoProgress * 0.85))
        : stage === 'uploading_thumbnail'
          ? 92
          : stage === 'confirming'
            ? 98
            : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 text-text-primary shadow-2xl">
        <header className="mb-5 flex items-center justify-between border-b border-border-muted pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <Film className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="upload-modal-title"
                className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary"
              >
                ENVIAR CLIPE
              </h2>
              <p className="font-mono text-mono-meta text-text-secondary">
                Upload direto para o Cloudflare R2 • MP4 ou WebM até 100 MB e 120s
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar modal de upload"
            className="rounded-control p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {stage === 'success' && uploadedClip ? (
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-3 rounded-card border border-success bg-success-surface p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <div className="space-y-1 font-mono text-mono-body text-text-primary">
                <p className="font-semibold">Seu clipe está no ar!</p>
                <p className="text-mono-meta">
                  <strong>{uploadedClip.title}</strong> foi processado e já pode ser reproduzido e
                  compartilhado.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/c/${uploadedClip.id}`} className="flex-1">
                <Button type="button" variant="primary" fullWidth>
                  IR PARA O CLIPE
                </Button>
              </Link>
              <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
                Fechar e atualizar lista
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Drag & Drop / Preview */}
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isUploading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-card border-[1.5px] border-dashed p-4 transition-colors ${
                isDragging
                  ? 'border-success bg-bg-elevated'
                  : inspectionError || formErrors.file
                    ? 'border-danger bg-bg-deep'
                    : 'border-border-muted bg-bg-deep'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,.mp4,.webm"
                onChange={handleFileInputChange}
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

              {!isInspecting && extractedMeta && selectedFile && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-control border border-border-muted bg-bg-surface sm:w-52">
                    <img
                      src={extractedMeta.thumbnailPreviewUrl}
                      alt="Pré-visualização da capa gerada do clipe"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1.5 right-1.5 rounded-control bg-bg-deep/90 px-1.5 py-0.5 font-mono text-mono-badge text-text-primary">
                      {formatDurationBadge(extractedMeta.durationSeconds)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate font-mono text-mono-body font-semibold text-text-primary">
                      {selectedFile.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-control border border-border-muted bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-text-primary">
                        {extractedMeta.resolutionLabel}
                      </span>
                      <span className="rounded-control border border-border-muted bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-text-primary">
                        {formatDurationBadge(extractedMeta.durationSeconds)}
                      </span>
                      <span className="rounded-control border border-border-muted bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-success">
                        {formatFileSizeMb(extractedMeta.videoSizeBytes)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Trocar arquivo
                    </Button>
                  </div>
                </div>
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

            {(inspectionError || formErrors.file) && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{inspectionError ?? formErrors.file}</span>
              </div>
            )}

            <Input
              label="Título do clipe"
              name="title"
              placeholder="Ex: Clutch 1v4 de AWP na Mirage"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
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
                onChange={(event) => setDescription(event.target.value)}
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
                onChange={(event) => setGameId(event.target.value)}
                className="h-11 w-full rounded-control border border-border-muted bg-bg-elevated px-3 font-mono text-mono-body text-text-primary focus:border-success focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {isLoadingGames ? 'Carregando jogos...' : 'Selecione o jogo'}
                </option>
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

            <TagsChipInput tags={tags} onChange={setTags} disabled={isUploading} />

            <PrivacySelector value={privacy} onChange={setPrivacy} disabled={isUploading} />

            {isUploading && (
              <div
                aria-live="polite"
                className="space-y-2 rounded-card border border-border-muted bg-bg-deep p-4"
              >
                <div className="flex items-center justify-between font-mono text-mono-meta">
                  <span className="font-semibold text-text-primary">{stageLabel}</span>
                  <span className="text-success">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface">
                  <div
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-full bg-success transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {stage === 'error' && uploadError && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-card border border-danger bg-danger-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2 font-mono text-mono-meta text-danger-text">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{uploadError}</span>
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

            <div className="flex flex-col-reverse gap-3 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={handleClose}>
                {isUploading ? 'Cancelar envio' : 'Cancelar'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isInspecting}
                isLoading={isUploading}
                loadingText={stageLabel || 'ENVIANDO...'}
              >
                PUBLICAR CLIPE
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
