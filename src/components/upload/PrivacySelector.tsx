'use client';

import { Globe, Link2, Users } from 'lucide-react';
import type { PrivacyLevel } from '@/types/clip';

export interface PrivacyOptionMeta {
  value: PrivacyLevel;
  label: string;
  description: string;
  Icon: typeof Globe;
}

export const PRIVACY_OPTIONS: readonly PrivacyOptionMeta[] = [
  {
    value: 'public',
    label: 'Público',
    description: 'Visível nas buscas, feed da comunidade e por link direto.',
    Icon: Globe,
  },
  {
    value: 'friends',
    label: 'Só Amigos',
    description: 'Restrito a você no MVP; preparado para amigos na v1.1.',
    Icon: Users,
  },
  {
    value: 'unlisted',
    label: 'Não-listado',
    description: 'Oculto das buscas; acessível apenas para quem tiver o link.',
    Icon: Link2,
  },
] as const;

export interface PrivacySelectorProps {
  value: PrivacyLevel;
  onChange: (value: PrivacyLevel) => void;
  disabled?: boolean;
}

export function PrivacySelector({
  value,
  onChange,
  disabled = false,
}: Readonly<PrivacySelectorProps>) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="font-mono text-mono-meta font-medium text-text-secondary">
        Privacidade
      </legend>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {PRIVACY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.Icon;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className={`flex flex-col items-start gap-1.5 rounded-card border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-success bg-bg-deep text-text-primary'
                  : 'border-border-muted bg-bg-elevated text-text-secondary hover:border-text-secondary hover:text-text-primary'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-mono-body font-semibold text-text-primary">
                <Icon
                  className={`h-4 w-4 ${isSelected ? 'text-success' : 'text-text-muted'}`}
                  aria-hidden="true"
                />
                {option.label}
              </span>
              <span className="font-mono text-mono-badge text-text-secondary">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
