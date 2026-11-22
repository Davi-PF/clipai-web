import { AuthGuard } from '@/components/auth/AuthGuard';
import { BentoDashboardWorkspace } from '@/components/dashboard/BentoDashboardWorkspace';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <BentoDashboardWorkspace />
    </AuthGuard>
  );
}
