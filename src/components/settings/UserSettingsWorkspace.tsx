'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Link2, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';
import { LiquidSidebar, type DashboardSection } from '@/components/dashboard/LiquidSidebar';
import { ConnectionsSettingsTab } from '@/components/settings/ConnectionsSettingsTab';
import { PrivacySettingsTab } from '@/components/settings/PrivacySettingsTab';
import { ProfileSettingsTab } from '@/components/settings/ProfileSettingsTab';
import { SecurityTwoFactorTab } from '@/components/settings/SecurityTwoFactorTab';
import { useSidebarState } from '@/contexts/sidebar-context';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/hooks/useAuth';

export type SettingsTabId = 'profile' | 'privacy' | 'connections' | 'security';

interface SettingsTabConfig {
  id: SettingsTabId;
  label: string;
  Icon: typeof UserIcon;
}

const SETTINGS_TABS: readonly SettingsTabConfig[] = [
  { id: 'profile', label: 'Perfil', Icon: UserIcon },
  { id: 'privacy', label: 'Privacidade', Icon: Lock },
  { id: 'connections', label: 'Conexões', Icon: Link2 },
  { id: 'security', label: 'Segurança (2FA)', Icon: ShieldCheck },
] as const;

function resolveInitialTab(param: string | null): SettingsTabId {
  if (
    param === 'privacy' ||
    param === 'connections' ||
    param === 'security' ||
    param === 'profile'
  ) {
    return param;
  }
  return 'profile';
}

export function UserSettingsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser, logout } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => resolveInitialTab(tabParam));
  const {
    isCollapsed: isSidebarCollapsed,
    toggleCollapsed: toggleSidebarCollapsed,
    setActiveSection,
  } = useSidebarState();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(resolveInitialTab(tabParam));
    }
  }, [tabParam]);

  const handleSelectSection = (section: DashboardSection) => {
    if (section === 'settings') {
      return;
    }
    if (section === 'studio') {
      router.push('/studio');
      return;
    }
    setActiveSection(section);
    router.push(section === 'home' ? '/dashboard' : `/dashboard?section=${section}`);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      success('Você saiu da sua conta com segurança.');
      router.replace('/login');
    } catch {
      showErrorToast('Erro ao encerrar a sessão.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep text-text-primary md:flex-row">
      <LiquidSidebar
        activeSection="settings"
        onSelectSection={handleSelectSection}
        onOpenUpload={() => router.push('/dashboard?upload=1')}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        showInlineCollapseToggle
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={() => void handleLogout()}
      />

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Cabeçalho da Página de Configurações */}
          <header className="flex flex-col justify-between gap-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0 space-y-1.5">
              <h1 className="font-display text-display-hero uppercase text-text-primary">
                CONFIGURAÇÕES DA CONTA
              </h1>
              <p className="font-mono text-mono-meta text-text-secondary">
                Gerencie seu perfil público, privacidade de coleções, vínculo com o Discord e
                autenticação em duas etapas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-control border border-border-muted bg-bg-elevated px-3.5 py-2 font-mono text-mono-meta text-text-primary transition-colors hover:border-success sm:self-auto"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              Voltar ao Dashboard
            </button>
          </header>

          {/* Barra de Abas (Perfil, Conexões, Segurança) */}
          <div
            role="tablist"
            aria-label="Seções de configurações"
            className="flex flex-wrap gap-2 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-2"
          >
            {SETTINGS_TABS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-mono text-mono-body transition-colors ${
                    isActive
                      ? 'border-success bg-bg-deep font-semibold text-text-primary'
                      : 'border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-success' : 'text-text-muted'}`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo da Aba Selecionada */}
          {activeTab === 'profile' && <ProfileSettingsTab user={user} onUserUpdated={updateUser} />}

          {activeTab === 'privacy' && <PrivacySettingsTab user={user} onUserUpdated={updateUser} />}

          {activeTab === 'connections' && (
            <ConnectionsSettingsTab user={user} onUserUpdated={updateUser} />
          )}

          {activeTab === 'security' && <SecurityTwoFactorTab user={user} />}
        </div>
      </main>
    </div>
  );
}
