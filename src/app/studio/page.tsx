import { AuthGuard } from '@/components/auth/AuthGuard';
import { CreatorStudioWorkspace } from '@/components/studio/CreatorStudioWorkspace';

export default function StudioPage() {
  return (
    <AuthGuard>
      <CreatorStudioWorkspace />
    </AuthGuard>
  );
}
