'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DashboardSection } from '@/components/dashboard/LiquidSidebar';

export type DashboardContentSection = Exclude<DashboardSection, 'settings' | 'studio'>;

export interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  activeSection: DashboardContentSection;
  setActiveSection: (section: DashboardContentSection) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardContentSection>('home');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const compactMedia = window.matchMedia('(min-width: 768px) and (max-width: 1279px)');
    if (compactMedia.matches) {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggleCollapsed,
      activeSection,
      setActiveSection,
    }),
    [isCollapsed, toggleCollapsed, activeSection],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarState(): SidebarContextValue {
  const context = useContext(SidebarContext);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [localSection, setLocalSection] = useState<DashboardContentSection>('home');

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
    activeSection: localSection,
    setActiveSection: setLocalSection,
  };
}
