import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UserSettingsWorkspace } from '@/components/settings/UserSettingsWorkspace';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <UserSettingsWorkspace />
      </Suspense>
    </AuthGuard>
  );
}
