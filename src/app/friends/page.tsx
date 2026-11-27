import { AuthGuard } from '@/components/auth/AuthGuard';
import { FriendsWorkspace } from '@/components/friends/FriendsWorkspace';

export default function FriendsPage() {
  return (
    <AuthGuard>
      <FriendsWorkspace />
    </AuthGuard>
  );
}
