'use client';

import { Globe, Lock, Users } from 'lucide-react';
import type { CollectionVisibility } from '@/types/collection';

export interface CollectionPrivacyOptionMeta {
  value: CollectionVisibility;
  label: string;
  description: string;
  Icon: typeof Globe;
}

export const COLLECTION_PRIVACY_OPTIONS: readonly CollectionPrivacyOptionMeta[] = [
  {
    value: 'public',
    label: 'Público',
    description: 'Qualquer pessoa pode visualizar esta coleção.',
    Icon: Globe,
  },
  {
    value: 'friends',
    label: 'Somente Amigos',
    description: 'Visível apenas para usuários logados no CLIPAÍ.',
    Icon: Users,
  },
  {
    value: 'private',
    label: 'Somente Eu',
    description: 'Acesso exclusivo para você; oculta para terceiros.',
    Icon: Lock,
  },
] as const;

export interface CollectionPrivacySelectorProps {
  value: CollectionVisibility;
  onChange: (value: CollectionVisibility) => void;
  disabled?: boolean;
}

export function CollectionPrivacySelector({
  value,
  onChange,
  disabled = false,
}: Readonly<CollectionPrivacySelectorProps>) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="font-mono text-mono-meta font-medium text-text-secondary">
        Nível de acesso
      </legend>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {COLLECTION_PRIVACY_OPTIONS.map((option) => {
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
                  className={`h-4 w-4 shrink-0 ${isSelected ? 'text-success' : 'text-text-muted'}`}
                  aria-hidden="true"
                />
                <span>{option.label}</span>
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
