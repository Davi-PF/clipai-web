'use client';

import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import type { MyInviteResponse } from '@/types/invite';

export interface InviteLinkCardProps {
  invite: MyInviteResponse | null;
  isLoading: boolean;
  onRetry?: () => void;
}

function resolveDisplayInviteUrl(invite: MyInviteResponse): string {
  if (invite.invite_url?.trim()) {
    return invite.invite_url.trim();
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/invite/${invite.invite_code}`;
  }
  return `/invite/${invite.invite_code}`;
}

export function InviteLinkCard({ invite, isLoading, onRetry }: Readonly<InviteLinkCardProps>) {
  const { success, error: showErrorToast } = useToast();
  const [copied, setCopied] = useState(false);

  const inviteUrl = invite ? resolveDisplayInviteUrl(invite) : '';

  const handleCopyInvite = async () => {
    if (!inviteUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      success('Link copiado! Mande na call ou DM do Discord.');
      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      showErrorToast('Não foi possível copiar o link de convite automaticamente.');
    }
  };

  return (
    <section
      data-testid="invite-friends-card"
      className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-success/60 bg-bg-deep text-success">
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
              CONVIDAR AMIGOS PARA O CLIPAÍ
            </h2>
          </div>
          <p className="font-mono text-mono-meta text-text-secondary">
            Compartilhe seu link pessoal. Quem entrar ou criar conta pelo convite vira seu amigo
            automaticamente para ver clipes e coleções exclusivos.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto lg:min-w-[460px]">
          {isLoading ? (
            <div className="h-11 w-full animate-pulse rounded-control border border-border-muted bg-bg-elevated" />
          ) : invite ? (
            <>
              <div
                data-testid="personal-invite-url"
                className="flex min-h-11 min-w-0 flex-1 items-center rounded-control border border-border-muted bg-bg-deep px-3.5 py-2 font-mono text-mono-meta text-text-primary"
              >
                <span className="truncate">{inviteUrl}</span>
              </div>
              <Button
                type="button"
                variant="primary"
                leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={() => void handleCopyInvite()}
                className="shrink-0"
              >
                {copied ? 'LINK COPIADO' : 'COPIAR LINK DE CONVITE'}
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-control border border-danger bg-danger-surface px-3.5 py-2.5 font-mono text-mono-meta text-danger-text">
              <span>Não foi possível carregar seu link de convite.</span>
              {onRetry && (
                <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                  Tentar novamente
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
