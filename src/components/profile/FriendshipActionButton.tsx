'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { friendsService } from '@/services/friends-service';
import type { FriendshipStatus } from '@/types/friendship';

export interface FriendshipActionButtonProps {
  targetUserId: string;
  targetUsername: string;
  targetDisplayName: string;
  isAuthenticated: boolean;
  status: FriendshipStatus;
  friendshipId: string | null;
  onStatusChange: (nextStatus: FriendshipStatus, nextFriendshipId: string | null) => void;
}

interface UnfriendDialogProps {
  isOpen: boolean;
  targetUsername: string;
  targetDisplayName: string;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function UnfriendConfirmDialog({
  isOpen,
  targetUsername,
  targetDisplayName,
  isBusy,
  onCancel,
  onConfirm,
}: Readonly<UnfriendDialogProps>) {
  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="unfriend-dialog-title"
      className="fixed inset-0 z-50 !m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-bg-deep/75 p-4 text-text-primary backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-bento border-[1.5px] border-danger bg-bg-surface p-6 text-text-primary shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-danger-surface text-danger-text">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2
              id="unfriend-dialog-title"
              className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
            >
              DESFAZER AMIZADE?
            </h2>
            <p className="break-words font-mono text-mono-meta text-text-secondary">
              Tem certeza que deseja desfazer a amizade com{' '}
              <strong className="text-text-primary">{targetDisplayName}</strong> (@{targetUsername}
              )? Vocês perderão o acesso a clipes e coleções exclusivos para amigos.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isBusy}
            loadingText="REMOVENDO..."
            onClick={onConfirm}
          >
            DESFAZER AMIZADE
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export function FriendshipActionButton({
  targetUserId,
  targetUsername,
  targetDisplayName,
  isAuthenticated,
  status,
  friendshipId,
  onStatusChange,
}: Readonly<FriendshipActionButtonProps>) {
  const { success, error: showErrorToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUnfriendOpen, setIsUnfriendOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  if (status === 'self') {
    return null;
  }

  if (!isAuthenticated) {
    const loginHref = `/login?redirect=${encodeURIComponent(`/u/${targetUsername}`)}`;
    return (
      <Link href={loginHref} data-testid="friendship-login-cta">
        <Button
          type="button"
          variant="secondary"
          typography="display"
          size="sm"
          leftIcon={<UserPlus className="h-4 w-4 text-success" />}
          className="border-border-muted bg-bg-elevated text-text-primary hover:border-success"
        >
          ENTRAR PARA ADICIONAR
        </Button>
      </Link>
    );
  }

  const handleSendRequest = async () => {
    setIsBusy(true);
    try {
      const response = await friendsService.sendRequest(targetUserId);
      const nextStatus: FriendshipStatus =
        response.auto_accepted || response.status === 'accepted' ? 'accepted' : 'pending_sent';
      onStatusChange(nextStatus, response.friendship_id);
      success(
        response.message ||
          (nextStatus === 'accepted'
            ? `Você e @${targetUsername} agora são amigos!`
            : `Pedido de amizade enviado para @${targetUsername}.`),
      );
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível enviar o pedido de amizade.';
      showErrorToast(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendshipId) {
      return;
    }
    setIsBusy(true);
    try {
      const response = await friendsService.acceptRequest(friendshipId);
      onStatusChange('accepted', response.friendship_id);
      success(response.message || `Pedido de @${targetUsername} aceito!`);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível aceitar o pedido de amizade.';
      showErrorToast(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async (successMessage: string) => {
    if (!friendshipId) {
      return;
    }
    setIsBusy(true);
    try {
      await friendsService.removeFriendship(friendshipId);
      setIsMenuOpen(false);
      setIsUnfriendOpen(false);
      onStatusChange('none', null);
      success(successMessage);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível atualizar o status de amizade.';
      showErrorToast(message);
    } finally {
      setIsBusy(false);
    }
  };

  if (status === 'none') {
    return (
      <Button
        type="button"
        variant="primary"
        size="sm"
        data-testid="friendship-add-btn"
        isLoading={isBusy}
        loadingText="ENVIANDO..."
        leftIcon={<UserPlus className="h-4 w-4" />}
        onClick={() => void handleSendRequest()}
      >
        + ADICIONAR AMIGO
      </Button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div
        data-testid="friendship-received-actions"
        className="inline-flex flex-wrap items-center gap-2"
      >
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={isBusy}
          loadingText="ACEITANDO..."
          leftIcon={<Check className="h-4 w-4" />}
          onClick={() => void handleAcceptRequest()}
        >
          ACEITAR
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          typography="display"
          disabled={isBusy}
          leftIcon={<X className="h-4 w-4" />}
          onClick={() => void handleRemove('Pedido de amizade recusado.')}
          className="border border-danger/70 text-danger-text hover:border-danger hover:bg-danger-surface hover:text-text-primary"
        >
          RECUSAR
        </Button>
      </div>
    );
  }

  if (status === 'pending_sent') {
    return (
      <div ref={menuContainerRef} className="relative inline-block">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          typography="display"
          data-testid="friendship-pending-sent-btn"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          disabled={isBusy}
          leftIcon={<Clock className="h-4 w-4 text-warning" />}
          rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          PEDIDO ENVIADO
        </Button>

        {isMenuOpen && (
          <div
            role="menu"
            aria-label="Opções do pedido enviado"
            className="absolute right-0 top-full z-30 mt-2 min-w-[190px] rounded-card border border-border-muted bg-bg-surface p-1.5 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              disabled={isBusy}
              onClick={() => void handleRemove('Pedido de amizade cancelado.')}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left font-mono text-mono-meta text-danger-text transition-colors hover:bg-danger-surface hover:text-text-primary disabled:opacity-50"
            >
              <X className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Cancelar pedido</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div ref={menuContainerRef} className="relative inline-block">
        <button
          type="button"
          data-testid="friendship-accepted-btn"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          disabled={isBusy}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="inline-flex min-h-9 items-center gap-2 rounded-control border border-success bg-success-surface px-3.5 py-2 font-display text-display-cta uppercase tracking-[0.06em] text-text-primary transition-colors hover:border-success hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success disabled:opacity-55"
        >
          <UserCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <span>AMIGOS ✓</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        </button>

        {isMenuOpen && (
          <div
            role="menu"
            aria-label="Opções de amizade"
            className="absolute right-0 top-full z-30 mt-2 min-w-[200px] rounded-card border border-border-muted bg-bg-surface p-1.5 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                setIsUnfriendOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left font-mono text-mono-meta text-danger-text transition-colors hover:bg-danger-surface hover:text-text-primary"
            >
              <UserMinus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Desfazer amizade</span>
            </button>
          </div>
        )}
      </div>

      <UnfriendConfirmDialog
        isOpen={isUnfriendOpen}
        targetUsername={targetUsername}
        targetDisplayName={targetDisplayName}
        isBusy={isBusy}
        onCancel={() => setIsUnfriendOpen(false)}
        onConfirm={() => void handleRemove(`Amizade com @${targetUsername} desfeita.`)}
      />
    </>
  );
}
