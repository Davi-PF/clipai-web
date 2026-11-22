import { Suspense } from 'react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { VerifyEmailContent } from '@/components/auth/VerifyEmailContent';

function VerifyEmailFallback() {
  return (
    <AuthCardLayout
      title="VERIFICAÇÃO DE E-MAIL"
      subtitle="Carregando parâmetros de confirmação..."
    >
      <p className="font-mono text-mono-body text-text-secondary">Aguarde um instante...</p>
    </AuthCardLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
