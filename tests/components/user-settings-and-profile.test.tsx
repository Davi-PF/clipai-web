import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/app/settings/page';
import { BentoDashboardWorkspace } from '@/components/dashboard/BentoDashboardWorkspace';
import { PublicProfileView } from '@/components/profile/PublicProfileView';
import { AppProviders } from '@/components/providers/AppProviders';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ApiClientError, clearAccessToken } from '@/lib/api-client';
import { authService } from '@/services/auth-service';
import { clipsService } from '@/services/clips-service';
import { collectionsService } from '@/services/collections-service';
import { userService } from '@/services/user-service';
import type { User } from '@/types/api';

const replaceMock = vi.fn();
const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      <AuthProvider>
        {ui}
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('SettingsPage (/settings) & PublicProfileView (/u/[username])', () => {
  const fetchMock = vi.fn();

  const BASE_USER: User = {
    id: 'u1',
    username: 'fallen_br',
    email: 'gabriel@clipai.com.br',
    display_name: 'Gabriel Toledo',
    bio: 'AWPer e criador de conteúdo.',
    avatar_url: null,
    avatar_source: 'none',
    discord_linked: true,
    discord_username: 'fallen_disc',
    discord_avatar_url: 'https://cdn.discordapp.com/avatars/123/abc.png',
    is_email_verified: true,
    is_2fa_enabled: false,
    has_password: true,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    replaceMock.mockReset();
    pushMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  function mockAuthenticatedBoot(userOverride: Partial<User> = {}) {
    const bootUser: User = { ...BASE_USER, ...userOverride };
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'settings_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(bootUser), { status: 200 }));
  }

  it('renders Profile tab, validates avatar file format/size, uploads to R2, syncs Discord avatar and saves bio', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot();

    const uploadAvatarSpy = vi.spyOn(userService, 'uploadAvatar').mockResolvedValue({
      ...BASE_USER,
      avatar_url: 'https://cdn.clipai.com.br/avatars/u1/custom.webp',
      avatar_source: 'custom',
    });

    const useDiscordAvatarSpy = vi.spyOn(userService, 'useDiscordAvatar').mockResolvedValue({
      ...BASE_USER,
      avatar_url: 'https://cdn.discordapp.com/avatars/123/abc.png',
      avatar_source: 'discord',
    });

    const updateProfileSpy = vi.spyOn(userService, 'updateProfile').mockResolvedValue({
      ...BASE_USER,
      display_name: 'Professor FalleN',
      bio: 'Bicampeão mundial de CS.',
    });

    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-tab-profile')).toBeInTheDocument();
    });

    // Reject invalid MIME type (.gif)
    const fileInput = screen.getByTestId('avatar-file-input');
    const invalidGif = new File(['gif-bytes'], 'anim.gif', { type: 'image/gif' });
    fireEvent.change(fileInput, { target: { files: [invalidGif] } });

    expect(
      screen.getAllByText('Formato de imagem não suportado. Use apenas JPG, PNG ou WebP.').length,
    ).toBeGreaterThan(0);
    expect(uploadAvatarSpy).not.toHaveBeenCalled();

    // Upload valid .webp file
    const validWebp = new File(['webp-bytes'], 'avatar.webp', { type: 'image/webp' });
    fireEvent.change(fileInput, { target: { files: [validWebp] } });

    await waitFor(() => {
      expect(uploadAvatarSpy).toHaveBeenCalledWith(validWebp, expect.any(Function));
    });
    expect(screen.getByText('Foto de perfil atualizada com sucesso!')).toBeInTheDocument();

    // Quick button "Usar avatar do Discord"
    await user.click(screen.getByRole('button', { name: 'Usar avatar do Discord' }));
    await waitFor(() => {
      expect(useDiscordAvatarSpy).toHaveBeenCalledOnce();
    });

    // Edit display_name and bio
    const nameInput = screen.getByLabelText('Nome de exibição');
    await user.clear(nameInput);
    await user.type(nameInput, 'Professor FalleN');

    const bioInput = screen.getByLabelText('Bio');
    await user.clear(bioInput);
    await user.type(bioInput, 'Bicampeão mundial de CS.');
    expect(screen.getByTestId('bio-char-counter')).toHaveTextContent('24/240');

    await user.click(screen.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }));
    await waitFor(() => {
      expect(updateProfileSpy).toHaveBeenCalledWith({
        display_name: 'Professor FalleN',
        bio: 'Bicampeão mundial de CS.',
      });
    });
  });

  it('protects DESVINCULAR Discord button when has_password is false and allows unlinking when has_password is true', async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams('tab=connections');

    // Case 1: has_password = false -> DESVINCULAR is disabled with warning
    mockAuthenticatedBoot({ has_password: false, discord_linked: true });

    const { unmount } = renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-tab-connections')).toBeInTheDocument();
    });

    expect(screen.getByTestId('discord-status-badge')).toHaveTextContent('Vinculado');
    const unlinkBtn = screen.getByRole('button', { name: 'DESVINCULAR' });
    expect(unlinkBtn).toBeDisabled();
    expect(screen.getByTestId('unlink-password-warning')).toBeInTheDocument();
    unmount();

    // Case 2: has_password = true -> DESVINCULAR works and transitions to Não vinculado
    clearAccessToken();
    mockAuthenticatedBoot({ has_password: true, discord_linked: true });
    const unlinkSpy = vi.spyOn(userService, 'unlinkDiscord').mockResolvedValue({
      ...BASE_USER,
      discord_linked: false,
      discord_username: null,
    });

    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'DESVINCULAR' })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: 'DESVINCULAR' }));
    await waitFor(() => {
      expect(unlinkSpy).toHaveBeenCalledOnce();
    });
    expect(screen.getByTestId('discord-status-badge')).toHaveTextContent('Não vinculado');
    expect(screen.getByRole('button', { name: 'VINCULAR CONTA DISCORD' })).toBeInTheDocument();
  });

  it('completes the 3-step 2FA activation wizard (local QR Code, 6-digit confirm, backup codes) and deactivation modal', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    mockAuthenticatedBoot({ is_2fa_enabled: false });

    vi.spyOn(authService, 'setup2fa').mockResolvedValue({
      otpauth_uri:
        'otpauth://totp/CLIPAI:gabriel@clipai.com.br?secret=JBSWY3DPEHPK3PXP&issuer=CLIPAI',
      manual_secret: 'JBSWY3DPEHPK3PXP',
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'CLIPAÍ',
    });

    vi.spyOn(authService, 'enable2fa').mockResolvedValue({
      is_2fa_enabled: true,
      backup_codes: ['7K4M-9P2X', '3R8W-5N6Q', '9B2V-4C7Z', '6H3J-8L5D'],
      message: 'Autenticação em duas etapas ativada com sucesso.',
    });

    const disableSpy = vi.spyOn(authService, 'disable2fa').mockResolvedValue({
      message: 'A autenticação em duas etapas (2FA) foi desativada com sucesso.',
    });

    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Segurança (2FA)' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Segurança (2FA)' }));
    expect(screen.getByTestId('two-factor-status-badge')).toHaveTextContent('DESATIVADO');

    // Step 1: Start setup -> renders local QR Code SVG and manual secret
    await user.click(screen.getByRole('button', { name: 'CONFIGURAR 2FA' }));

    await waitFor(() => {
      expect(screen.getByTestId('local-2fa-qrcode').querySelector('svg')).toBeInTheDocument();
    });
    expect(screen.getByTestId('manual-2fa-secret')).toHaveTextContent('JBSWY3DPEHPK3PXP');

    await user.click(screen.getByRole('button', { name: 'Copiar chave secreta' }));
    expect(writeTextMock).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');

    // Step 2: Confirm 6-digit code
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '482910');
    await user.click(screen.getByRole('button', { name: 'ATIVAR 2FA' }));

    // Step 3: Backup codes screen
    await waitFor(() => {
      expect(screen.getByTestId('two-factor-step-backup-codes')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('backup-code-item')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'COPIAR CÓDIGOS' }));
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('7K4M-9P2X'));

    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await user.click(screen.getByRole('button', { name: 'BAIXAR .TXT' }));
    expect(anchorClickSpy).toHaveBeenCalledOnce();
    anchorClickSpy.mockRestore();

    const finishBtn = screen.getByRole('button', { name: 'CONCLUIR ATIVAÇÃO' });
    expect(finishBtn).toBeDisabled();

    await user.click(
      screen.getByLabelText('Confirmo que salvei meus códigos de backup em um local seguro.'),
    );
    expect(finishBtn).not.toBeDisabled();
    await user.click(finishBtn);

    expect(screen.getByTestId('two-factor-status-badge')).toHaveTextContent('ATIVADO');

    // Deactivation flow via modal
    await user.click(screen.getByRole('button', { name: 'DESATIVAR 2FA' }));
    expect(
      screen.getByRole('heading', { name: 'DESATIVAR 2FA AUTHENTICATOR' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Código 2FA ou código de backup'), '482910');
    await user.type(screen.getByLabelText('Senha atual'), 'StrongPassword!2026');
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR DESATIVAÇÃO' }));

    await waitFor(() => {
      expect(disableSpy).toHaveBeenCalledWith({
        code: '482910',
        password: 'StrongPassword!2026',
      });
    });
    expect(screen.getByTestId('two-factor-status-badge')).toHaveTextContent('DESATIVADO');
  });

  it('renders PublicProfileView (/u/[username]) with avatar, DiscordBadge, bio and public clips list, plus 404 state', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValueOnce({
      id: 'u1',
      username: 'fallen_br',
      display_name: 'FalleN',
      bio: 'Professor do CS2.',
      avatar_url: 'https://cdn.clipai.com.br/avatars/u1.webp',
      avatar_source: 'custom',
      discord_linked: true,
      discord_username: 'fallen_disc',
      stats: {
        clips_count: 1,
        total_views: 340,
        total_likes: 58,
        collections_count: 2,
      },
      created_at: '2026-11-21T22:00:00Z',
    });

    vi.spyOn(userService, 'listUserClips').mockResolvedValueOnce({
      items: [
        {
          id: 'clip-1',
          slug: 'clutch-mirage',
          title: 'Clutch 1v4 de AWP na Mirage',
          privacy: 'public',
          video_url: 'https://cdn.clipai.com.br/clips/c1.mp4',
          thumbnail_url: 'https://cdn.clipai.com.br/clips/c1.webp',
          duration_seconds: 34,
          views_count: 340,
          likes_count: 58,
          favorites_count: 12,
          is_liked_by_me: false,
          is_favorited_by_me: false,
          author: {
            id: 'u1',
            username: 'fallen_br',
            display_name: 'FalleN',
            avatar_url: 'https://cdn.clipai.com.br/avatars/u1.webp',
            discord_linked: true,
            discord_username: 'fallen_disc',
          },
          game: { id: 'g1', name: 'CS2', slug: 'cs2' },
          tags: ['clutch'],
          created_at: '2026-11-21T22:05:00Z',
        },
      ],
      page: 1,
      page_size: 12,
      total: 1,
      total_pages: 1,
    });

    const { unmount } = renderWithProviders(<PublicProfileView username="fallen_br" />);

    await waitFor(() => {
      expect(screen.getByTestId('public-profile-header')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'FalleN' })).toBeInTheDocument();
    expect(screen.getByText('Professor do CS2.')).toBeInTheDocument();
    expect(screen.getByTestId('discord-badge')).toHaveTextContent('@fallen_disc');
    expect(screen.getByText('Clutch 1v4 de AWP na Mirage')).toBeInTheDocument();
    unmount();

    // 404 state
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
    vi.spyOn(userService, 'getPublicProfile').mockRejectedValueOnce(
      new ApiClientError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: 'Usuário não encontrado.',
      }),
    );

    renderWithProviders(<PublicProfileView username="ghost_player" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'PERFIL NÃO ENCONTRADO' })).toBeInTheDocument();
    });
  });

  it('preserves collapsed LiquidSidebar state when navigating from dashboard to /settings', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot();

    vi.spyOn(clipsService, 'listGames').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 1,
    });
    vi.spyOn(clipsService, 'listTags').mockResolvedValue({ items: [] });
    vi.spyOn(clipsService, 'listClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 6,
      total: 0,
      total_pages: 1,
    });
    vi.spyOn(collectionsService, 'listCollections').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
    });

    const { rerender } = render(
      <AppProviders>
        <BentoDashboardWorkspace />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Sidebar Líquida de navegação')).toBeInTheDocument();
    });

    const collapseButtons = screen.getAllByRole('button', { name: 'Recolher sidebar' });
    await user.click(collapseButtons[0]!);
    expect(screen.getByLabelText('Sidebar Líquida de navegação')).toHaveAttribute(
      'data-collapsed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Abrir configurações do usuário' }));
    expect(pushMock).toHaveBeenCalledWith('/settings');

    rerender(
      <AppProviders>
        <SettingsPage />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CONFIGURAÇÕES DA CONTA' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Sidebar Líquida de navegação')).toHaveAttribute(
      'data-collapsed',
      'true',
    );

    // Selecting "Favoritos" from /settings updates SidebarContext and navigates to /dashboard?section=favorites
    const favoritesButtons = screen.getAllByRole('button', { name: 'Favoritos' });
    await user.click(favoritesButtons[0]!);
    expect(pushMock).toHaveBeenCalledWith('/dashboard?section=favorites');

    // Rerender BentoDashboardWorkspace WITHOUT updating window.location.search (simulates Next.js transition timing)
    const listClipsSpy = vi.spyOn(clipsService, 'listClips');
    rerender(
      <AppProviders>
        <BentoDashboardWorkspace />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ favorited: true }));
    });
    expect(screen.getAllByRole('button', { name: 'Favoritos' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Direct URL load (e.g. F5 on /dashboard?section=featured) also syncs section
    window.history.replaceState(null, '', '/dashboard?section=featured');
    listClipsSpy.mockClear();
    rerender(
      <AppProviders>
        <BentoDashboardWorkspace key="reload-featured" />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(listClipsSpy).toHaveBeenCalledWith(expect.objectContaining({ sort: 'popular' }));
    });
    window.history.replaceState(null, '', '/');
  });
});
