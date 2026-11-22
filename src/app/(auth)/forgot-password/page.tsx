import { GuestGuard } from '@/components/auth/GuestGuard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <GuestGuard>
      <ForgotPasswordForm />
    </GuestGuard>
  );
}
