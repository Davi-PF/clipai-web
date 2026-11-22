'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface DeleteClipDialogProps {
  isOpen: boolean;
  clipTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteClipDialog({
  isOpen,
  clipTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: Readonly<DeleteClipDialogProps>) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-clip-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-bento border-[1.5px] border-danger bg-bg-surface p-6 text-text-primary shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-danger-surface text-danger-text">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2
              id="delete-clip-title"
              className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
            >
              EXCLUIR CLIPE PERMANENTEMENTE?
            </h2>
            <p className="font-mono text-mono-meta text-text-secondary">
              O clipe <strong className="text-text-primary">{clipTitle}</strong> e seus arquivos no
              armazenamento serão removidos de forma irreversível.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isDeleting}
            loadingText="EXCLUINDO..."
            onClick={onConfirm}
          >
            CONFIRMAR EXCLUSÃO
          </Button>
        </div>
      </div>
    </div>
  );
}
