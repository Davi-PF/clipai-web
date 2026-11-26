'use client';

import { CheckCircle2 } from 'lucide-react';

export type SettingsStatusTone = 'success' | 'warning' | 'muted';

export interface SettingsStatusBadgeProps {
  label: string;
  tone: SettingsStatusTone;
  testId?: string;
  pulsing?: boolean;
  uppercase?: boolean;
}

const TONE_CLASSES: Record<SettingsStatusTone, { container: string; dot: string }> = {
  success: {
    container: 'border-success bg-success-surface text-success',
    dot: 'bg-success',
  },
  warning: {
    container: 'border-warning bg-bg-deep text-warning',
    dot: 'bg-warning',
  },
  muted: {
    container: 'border-border-muted bg-bg-deep text-text-secondary',
    dot: 'bg-text-muted',
  },
};

export function SettingsStatusBadge({
  label,
  tone,
  testId,
  pulsing = false,
  uppercase = false,
}: Readonly<SettingsStatusBadgeProps>) {
  const styles = TONE_CLASSES[tone];
  const dotResponsiveVisibility = tone === 'success' ? 'sm:hidden' : '';

  return (
    <span
      data-testid={testId}
      className={`inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 font-mono text-mono-badge/none font-semibold sm:h-6 sm:px-2.5 ${
        uppercase ? 'uppercase' : ''
      } ${styles.container}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot} ${
          pulsing ? 'animate-pulse' : ''
        } ${dotResponsiveVisibility}`.trim()}
      />
      {tone === 'success' && (
        <CheckCircle2
          className="hidden h-3.5 w-3.5 shrink-0 text-success sm:inline-block"
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
}
