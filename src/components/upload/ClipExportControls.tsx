'use client';

import { AlertTriangle, HardDrive } from 'lucide-react';
import { formatFileSizeMb } from '@/lib/validators';
import { CLIP_EXPORT_PRESETS } from '@/lib/video-editor-utils';
import type { ClipEditEstimate, ClipExportPreset } from '@/types/clip';

export interface ClipExportControlsProps {
  preset: ClipExportPreset;
  estimate: ClipEditEstimate;
  disabled?: boolean;
  onChangePreset: (preset: ClipExportPreset) => void;
}

export function ClipExportControls({
  preset,
  estimate,
  disabled = false,
  onChangePreset,
}: Readonly<ClipExportControlsProps>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border-muted bg-bg-surface px-3 py-2.5">
      {/* Seletor segmentado horizontal compacto (1 única linha) */}
      <div
        role="group"
        aria-label="Preset de exportação e compressão"
        className="inline-flex flex-wrap items-center gap-0.5 rounded-control border border-border-muted bg-bg-deep p-0.5"
      >
        {CLIP_EXPORT_PRESETS.map((option) => {
          const isSelected = preset === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              data-testid={`export-preset-${option.id}`}
              title={option.description}
              onClick={() => onChangePreset(option.id)}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-mono text-mono-badge transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                isSelected
                  ? 'bg-bg-elevated font-semibold text-text-primary shadow-sm ring-1 ring-success'
                  : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
              }`}
            >
              <span>{option.label}</span>
              {option.id === '720p' && (
                <span className="rounded-[4px] bg-warning px-1 py-0.5 font-mono text-[9px] font-bold uppercase leading-none text-bg-deep">
                  Rec.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Resumo discreto do tamanho estimado e economia no R2 */}
      <div
        data-testid="estimated-size-summary"
        className={`inline-flex flex-wrap items-center gap-1.5 font-mono text-mono-badge ${
          estimate.exceedsMaxSize
            ? 'rounded-control border border-danger bg-danger-surface px-2 py-1 text-danger-text'
            : 'text-text-secondary'
        }`}
      >
        {estimate.exceedsMaxSize ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              ~{formatFileSizeMb(estimate.estimatedBytes)} • Acima de 100 MB — reduza o corte ou use
              480p Leve
            </span>
          </>
        ) : (
          <>
            <HardDrive className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            <span>
              <strong className="text-text-primary">
                ~{formatFileSizeMb(estimate.estimatedBytes)}
              </strong>
            </span>
            {estimate.savingsPercent > 0 ? (
              <span className="rounded-control bg-success-surface px-1.5 py-0.5 font-semibold text-success">
                -{estimate.savingsPercent}%
              </span>
            ) : (
              <span className="text-text-muted">original</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
