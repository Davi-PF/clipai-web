import { Suspense } from 'react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { DiscordCallbackContent } from '@/components/auth/DiscordCallbackContent';

function DiscordCallbackFallback() {
  return (
    <AuthCardLayout
      title="CONECTANDO COM O DISCORD"
      subtitle="Carregando parâmetros de retorno OAuth2..."
    >
      <p className="font-mono text-mono-body text-text-secondary">Aguarde um instante...</p>
    </AuthCardLayout>
  );
}

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<DiscordCallbackFallback />}>
      <DiscordCallbackContent />
    </Suspense>
  );
}
