'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import { AlertTriangle, Check, Globe, Info, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { normalizeCollectionVisibility } from '@/lib/collection-privacy';
import { userService } from '@/services/user-service';
import type { CollectionVisibility, User } from '@/types/api';

export interface PrivacySettingsTabProps {
  user: User;
  onUserUpdated: (nextUser: User) => void;
}

interface GlobalVisibilityOption {
  value: CollectionVisibility;
  label: string;
  description: string;
  Icon: typeof Globe;
}

const GLOBAL_VISIBILITY_OPTIONS: readonly GlobalVisibilityOption[] = [
  {
    value: 'public',
    label: 'Público',
    description: 'Todo mundo pode ver as coleções marcadas para exibição no seu perfil.',
    Icon: Globe,
  },
  {
    value: 'friends',
    label: 'Somente Amigos',
    description: 'Apenas amigos (usuários logados) podem ver suas coleções no perfil.',
    Icon: Users,
  },
  {
    value: 'private',
    label: 'Somente Eu (Ninguém)',
    description: 'Oculta a aba de coleções do seu perfil para terceiros; apenas você pode vê-las.',
    Icon: Lock,
  },
] as const;

export function PrivacySettingsTab({ user, onUserUpdated }: Readonly<PrivacySettingsTabProps>) {
  const { success, error: showErrorToast } = useToast();

  const [selectedVisibility, setSelectedVisibility] = useState<CollectionVisibility>(() =>
    normalizeCollectionVisibility(user.collections_visibility),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedVisibility(normalizeCollectionVisibility(user.collections_visibility));
  }, [user.collections_visibility]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const updatedUser = await userService.updateProfile({
        collections_visibility: selectedVisibility,
      });
      onUserUpdated(updatedUser);
      success('Privacidade das coleções atualizada com sucesso!');
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar as configurações de privacidade.';
      setFormError(message);
      showErrorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div data-testid="settings-tab-privacy" className="space-y-6">
      <section className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 sm:p-6">
        <header className="mb-5 border-b border-border-muted pb-4">
          <h2 className="font-display text-display-md uppercase leading-none text-text-primary">
            VISIBILIDADE GLOBAL DAS COLEÇÕES NO PERFIL
          </h2>
          <p className="mt-1.5 font-mono text-mono-meta text-text-secondary">
            Controle quem pode visualizar as coleções exibidas na aba Coleções do seu perfil{' '}
            <span className="text-text-primary">/u/{user.username}</span>.
          </p>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-card border border-danger bg-danger-surface p-3 font-mono text-mono-meta text-danger-text"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <fieldset className="space-y-3" disabled={isSaving}>
            <legend className="sr-only">Visibilidade global das coleções no perfil</legend>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {GLOBAL_VISIBILITY_OPTIONS.map(({ value, label, description, Icon }) => {
                const isSelected = selectedVisibility === value;
                const radioId = `collections-visibility-${value}`;

                return (
                  <label
                    key={value}
                    htmlFor={radioId}
                    className={`group relative flex cursor-pointer flex-col gap-2.5 rounded-card border-[1.5px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-success ${
                      isSelected
                        ? 'border-success bg-bg-deep text-text-primary'
                        : 'border-border-muted bg-bg-elevated text-text-secondary hover:border-text-secondary hover:text-text-primary'
                    } ${isSaving ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      id={radioId}
                      type="radio"
                      name="collections_visibility"
                      value={value}
                      checked={isSelected}
                      onChange={() => setSelectedVisibility(value)}
                      disabled={isSaving}
                      className="sr-only"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-mono text-mono-body font-semibold text-text-primary">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-success' : 'text-text-muted'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{label}</span>
                      </span>

                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-success bg-success text-bg-deep'
                            : 'border-border-muted bg-bg-surface text-transparent'
                        }`}
                      >
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    </div>

                    <span className="font-mono text-mono-meta text-text-secondary">
                      {description}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div
            data-testid="global-ceiling-note"
            className="flex items-start gap-3 rounded-card border border-border-muted bg-bg-deep p-4"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="font-mono text-mono-meta text-text-secondary">
              <strong className="text-text-primary">Teto Global:</strong> esta configuração define o
              limite máximo de visibilidade das coleções no seu perfil. Cada coleção pode restringir
              ainda mais individualmente, mas nunca ultrapassar este limite.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" isLoading={isSaving} loadingText="SALVANDO...">
              SALVAR PRIVACIDADE
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
