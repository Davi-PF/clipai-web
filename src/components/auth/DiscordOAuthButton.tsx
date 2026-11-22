'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DiscordIcon } from '@/components/ui/DiscordBadge';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { authService } from '@/services/auth-service';
import type { DiscordAuthMode } from '@/types/auth';

export interface DiscordOAuthButtonProps {
  mode?: DiscordAuthMode;
  label?: string;
  showDivider?: boolean;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export function DiscordOAuthButton({
  mode = 'login',
  label = 'ENTRAR COM DISCORD',
  showDivider = true,
  disabled = false,
  onError,
}: Readonly<DiscordOAuthButtonProps>) {
  const { error: showErrorToast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleDiscordClick = async () => {
    setIsRedirecting(true);
    try {
      const response = await authService.getDiscordAuthUrl(mode);
      const targetUrl = response.url || response.authorization_url;
      if (typeof window !== 'undefined' && targetUrl) {
        window.location.assign(targetUrl);
      }
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível iniciar a autenticação com o Discord. Tente novamente.';
      onError?.(message);
      showErrorToast(message);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {showDivider && (
        <div className="relative flex items-center py-1" role="separator">
          <div className="flex-grow border-t border-border-muted" />
          <span className="mx-3 shrink-0 font-mono text-mono-badge uppercase text-text-muted">
            ou continue com
          </span>
          <div className="flex-grow border-t border-border-muted" />
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        typography="display"
        fullWidth
        disabled={disabled || isRedirecting}
        isLoading={isRedirecting}
        loadingText="CONECTANDO AO DISCORD..."
        leftIcon={<DiscordIcon className="h-4 w-4 text-success" />}
        onClick={() => void handleDiscordClick()}
        className="border-border-muted bg-bg-elevated text-text-primary hover:border-success hover:bg-bg-deep"
      >
        {label}
      </Button>
    </div>
  );
}
