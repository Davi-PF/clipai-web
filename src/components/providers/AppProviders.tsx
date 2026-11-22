'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ToastViewport } from '@/components/ui/Toast';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ToastProvider>
      <AuthProvider>
        {children}
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>
  );
}
