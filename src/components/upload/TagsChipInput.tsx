'use client';

import { useState, type KeyboardEvent } from 'react';
import { Hash, Plus, X } from 'lucide-react';
import { MAX_TAGS_COUNT, normalizeTagSlug } from '@/lib/validators';

export interface TagsChipInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagsChipInput({ tags, onChange, disabled = false }: Readonly<TagsChipInputProps>) {
  const [draftTag, setDraftTag] = useState('');
  const [tagHintError, setTagHintError] = useState<string | null>(null);

  const addTag = (raw: string) => {
    const normalized = normalizeTagSlug(raw);
    if (!normalized || normalized.length < 2) {
      setTagHintError('Use pelo menos 2 letras ou números para a tag.');
      return;
    }
    if (tags.includes(normalized)) {
      setDraftTag('');
      setTagHintError(null);
      return;
    }
    if (tags.length >= MAX_TAGS_COUNT) {
      setTagHintError(`Limite máximo de ${MAX_TAGS_COUNT} tags atingido.`);
      return;
    }

    onChange([...tags, normalized]);
    setDraftTag('');
    setTagHintError(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (draftTag.trim()) {
        addTag(draftTag);
      }
    } else if (event.key === 'Backspace' && !draftTag && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
    setTagHintError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="clip-tags-input"
          className="font-mono text-mono-meta font-medium text-text-secondary"
        >
          Tags (opcional)
        </label>
        <span className="font-mono text-mono-badge text-text-muted">
          {tags.length}/{MAX_TAGS_COUNT}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-3 focus-within:border-success">
          <Hash className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <input
            id="clip-tags-input"
            type="text"
            value={draftTag}
            disabled={disabled}
            placeholder="Ex: clutch, awp, ace (Enter para adicionar)"
            onChange={(event) => {
              setDraftTag(event.target.value);
              if (tagHintError) {
                setTagHintError(null);
              }
            }}
            onKeyDown={handleKeyDown}
            className="h-full w-full bg-transparent font-mono text-mono-body text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="button"
          disabled={disabled || !draftTag.trim()}
          onClick={() => addTag(draftTag)}
          aria-label="Adicionar tag"
          className="inline-flex h-11 items-center gap-1.5 rounded-control border border-border-muted bg-bg-elevated px-3.5 font-mono text-mono-meta text-text-primary transition-colors hover:border-success hover:bg-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar
        </button>
      </div>

      {tagHintError && (
        <p role="alert" className="font-mono text-mono-meta text-danger-text">
          {tagHintError}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge text-text-primary"
            >
              <span>#{tag}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remover tag ${tag}`}
                className="rounded-control text-text-muted transition-colors hover:text-danger-text disabled:cursor-not-allowed"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
