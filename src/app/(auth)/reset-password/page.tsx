import { Suspense } from 'react';
import { AuthCardLayout } from '@/components/auth/AuthCardLayout';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

function ResetPasswordFallback() {
  return (
    <AuthCardLayout title="REDEFINIR SENHA" subtitle="Carregando formulário de redefinição...">
      <p className="font-mono text-mono-body text-text-secondary">Aguarde um instante...</p>
    </AuthCardLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
