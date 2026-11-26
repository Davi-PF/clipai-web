'use client';

import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CancelUploadConfirmDialogProps {
  isOpen: boolean;
  isRendering: boolean;
  isUploading: boolean;
  onContinue: () => void;
  onConfirmCancel: () => void;
}

function getConfirmDescription(isRendering: boolean, isUploading: boolean): string {
  if (isRendering) {
    return 'A renderização do clipe no navegador está em andamento. Se cancelar agora, todo o progresso da renderização e da edição será perdido.';
  }
  if (isUploading) {
    return 'O envio do clipe para o servidor está em andamento. Se cancelar agora, o upload será interrompido e o progresso será perdido.';
  }
  return 'Você já carregou um vídeo neste formulário. Se sair agora, os cortes, ajustes e metadados preenchidos serão perdidos.';
}

export function CancelUploadConfirmDialog({
  isOpen,
  isRendering,
  isUploading,
  onContinue,
  onConfirmCancel,
}: Readonly<CancelUploadConfirmDialogProps>) {
  if (!isOpen) {
    return null;
  }

  const dialogOverlay = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancel-upload-confirm-title"
      aria-describedby="cancel-upload-confirm-description"
      data-testid="cancel-upload-confirm-dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-bg-deep/80 p-4 backdrop-blur-sm"
    >
      <div
        data-testid="cancel-upload-confirm-card"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-bento border-[1.5px] border-danger bg-bg-surface p-6 text-text-primary shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-danger-surface text-danger-text">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <h3
              id="cancel-upload-confirm-title"
              className="font-display text-display-md uppercase text-text-primary"
            >
              CANCELAR ENVIO DO CLIPE?
            </h3>
            <p
              id="cancel-upload-confirm-description"
              className="break-words font-mono text-mono-meta text-text-secondary"
            >
              {getConfirmDescription(isRendering, isUploading)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onContinue}>
            Continuar envio
          </Button>
          <Button type="button" variant="danger" onClick={onConfirmCancel}>
            Sim, cancelar
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return dialogOverlay;
  }

  return createPortal(dialogOverlay, document.body);
}
