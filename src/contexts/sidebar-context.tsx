'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggleCollapsed,
    }),
    [isCollapsed, toggleCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarState(): SidebarContextValue {
  const context = useContext(SidebarContext);
  const [localCollapsed, setLocalCollapsed] = useState(false);

  const toggleLocal = useCallback(() => {
    setLocalCollapsed((prev) => !prev);
  }, []);

  if (context) {
    return context;
  }

  return {
    isCollapsed: localCollapsed,
    setIsCollapsed: setLocalCollapsed,
    toggleCollapsed: toggleLocal,
  };
}
