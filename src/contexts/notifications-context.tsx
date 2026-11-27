'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotificationsController,
  type NotificationsController,
} from '@/hooks/useNotificationsController';

const NotificationsContext = createContext<NotificationsController | null>(null);

export function NotificationsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { isAuthenticated } = useAuth();
  const controller = useNotificationsController({ enabled: isAuthenticated });

  return (
    <NotificationsContext.Provider value={controller}>{children}</NotificationsContext.Provider>
  );
}

export function useOptionalNotifications(): NotificationsController | null {
  return useContext(NotificationsContext);
}
