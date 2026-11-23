'use client';

import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { useToast, type ToastItemData, type ToastType } from '@/contexts/toast-context';

const TOAST_STYLES: Record<
  ToastType,
  { container: string; iconClass: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    container: 'border-success bg-success-surface text-text-primary',
    iconClass: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'border-warning bg-bg-surface text-text-primary',
    iconClass: 'text-warning',
    Icon: AlertTriangle,
  },
  error: {
    container: 'border-danger bg-danger-surface text-text-primary',
    iconClass: 'text-danger-text',
    Icon: XCircle,
  },
};

function ToastItem({
  toast,
  onDismiss,
}: Readonly<{ toast: ToastItemData; onDismiss: (id: string) => void }>) {
  const { container, iconClass, Icon } = TOAST_STYLES[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border-[1.5px] p-3.5 shadow-lg ${container}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 font-mono text-mono-body">
        {toast.title && <p className="font-semibold text-text-primary">{toast.title}</p>}
        <p className="text-text-primary">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="inline-flex shrink-0 rounded-control p-1 text-text-secondary transition-colors hover:bg-bg-deep hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Notificações"
      className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 md:bottom-4"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </section>
  );
}
