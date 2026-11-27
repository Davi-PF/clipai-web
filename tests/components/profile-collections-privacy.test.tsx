import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/app/settings/page';
import { CollectionDetailView } from '@/components/collections/CollectionDetailView';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';
import { PublicProfileView } from '@/components/profile/PublicProfileView';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ApiClientError, clearAccessToken } from '@/lib/api-client';
import { collectionsService } from '@/services/collections-service';
import { userService } from '@/services/user-service';
import type { Collection, PublicUserProfile, User } from '@/types/api';

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

const OWNER_USER: User = {
  id: 'u-owner',
  username: 'fallen_br',
  email: 'gabriel@clipai.com.br',
  display_name: 'FalleN',
  bio: 'AWPer do CS2.',
  avatar_url: null,
  avatar_source: 'none',
  collections_visibility: 'public',
  is_email_verified: true,
  is_2fa_enabled: false,
  has_password: true,
};

const FRIEND_USER: User = {
  ...OWNER_USER,
  id: 'u-friend',
  username: 'fer_br',
  email: 'fer@clipai.com.br',
  display_name: 'fer',
};

const BASE_PROFILE: PublicUserProfile = {
  id: 'u-owner',
  username: 'fallen_br',
  display_name: 'FalleN',
  bio: 'AWPer do CS2.',
  avatar_url: null,
  collections_visibility: 'public',
  stats: {
    clips_count: 1,
    total_views: 150,
    total_likes: 20,
    collections_count: 2,
  },
  created_at: '2026-11-21T20:00:00Z',
};

const PROFILE_COLLECTIONS: Collection[] = [
  {
    id: 'col-public',
    title: 'Clutches de AWP',
    description: 'Melhores rounds 1vX na Mirage.',
    privacy: 'public',
    effective_privacy: 'public',
    show_on_profile: true,
    accent_color: '#2EB886',
    clips_count: 4,
    cover_thumbnail_url: 'https://cdn.clipai.com.br/thumbs/c1.webp',
    owner: { id: 'u-owner', username: 'fallen_br', display_name: 'FalleN' },
    created_at: '2026-11-21T21:00:00Z',
    updated_at: '2026-11-21T21:00:00Z',
  },
  {
    id: 'col-friends',
    title: 'Treinos do Time',
    description: null,
    privacy: 'friends',
    effective_privacy: 'private',
    show_on_profile: true,
    accent_color: '#E8B04B',
    clips_count: 1,
    cover_thumbnail_url: null,
    owner: { id: 'u-owner', username: 'fallen_br', display_name: 'FalleN' },
    created_at: '2026-11-21T22:00:00Z',
    updated_at: '2026-11-21T22:00:00Z',
  },
];

describe('Profile Collections Privacy — Settings, Modal, Profile & Detail View', () => {
  const fetchMock = vi.fn();

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
    const bootUser: User = { ...OWNER_USER, ...userOverride };
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'privacy_jwt', token_type: 'bearer', expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(bootUser), { status: 200 }));
  }

  function mockAnonymousBoot() {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
  }

  it('renders Privacy tab via ?tab=privacy in /settings, updates collections_visibility and displays success toast', async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams('tab=privacy');
    mockAuthenticatedBoot({ collections_visibility: 'public' });

    const updateProfileSpy = vi.spyOn(userService, 'updateProfile').mockResolvedValue({
      ...OWNER_USER,
      collections_visibility: 'friends',
    });

    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-tab-privacy')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Privacidade' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('global-ceiling-note')).toHaveTextContent('Teto Global');

    const publicRadio = screen.getByRole('radio', { name: /Público/i });
    const friendsRadio = screen.getByRole('radio', { name: /Somente Amigos/i });
    const privateRadio = screen.getByRole('radio', { name: /Somente Eu \(Ninguém\)/i });

    expect(publicRadio).toBeChecked();
    expect(privateRadio).not.toBeChecked();

    await user.click(friendsRadio);
    expect(friendsRadio).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'SALVAR PRIVACIDADE' }));

    await waitFor(() => {
      expect(updateProfileSpy).toHaveBeenCalledWith({
        collections_visibility: 'friends',
      });
    });

    expect(
      screen.getByText('Privacidade das coleções atualizada com sucesso!'),
    ).toBeInTheDocument();
  });

  it('renders show_on_profile toggle, #E8B04B global ceiling alert and owner-only private hint in CreateCollectionModal', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot({ collections_visibility: 'friends' });

    const onClose = vi.fn();
    const onSaved = vi.fn();
    const createSpy = vi
      .spyOn(collectionsService, 'createCollection')
      .mockResolvedValue(PROFILE_COLLECTIONS[0]!);

    renderWithProviders(<CreateCollectionModal isOpen onClose={onClose} onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'NOVA COLEÇÃO' })).toBeInTheDocument();
    });

    // All 3 collection privacy buttons exist
    expect(screen.getByRole('button', { name: /Público/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Somente Amigos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Somente Eu/i })).toBeInTheDocument();

    const profileSwitch = screen.getByRole('switch', { name: /Exibir no meu perfil público/i });
    expect(profileSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByTestId('collection-ceiling-warning')).not.toBeInTheDocument();

    // Turning toggle ON while collection is Público and global ceiling is Somente Amigos -> Amber alert
    await user.click(profileSwitch);
    expect(profileSwitch).toHaveAttribute('aria-checked', 'true');

    const warning = screen.getByTestId('collection-ceiling-warning');
    expect(warning).toHaveClass('border-warning');
    expect(warning).toHaveTextContent(/Somente Amigos/);
    const settingsLink = screen.getByRole('link', { name: /Configurações > Privacidade/i });
    expect(settingsLink).toHaveAttribute('href', '/settings?tab=privacy');

    // Selecting Somente Amigos removes ceiling warning (no longer stricter)
    await user.click(screen.getByRole('button', { name: /Somente Amigos/i }));
    expect(screen.queryByTestId('collection-ceiling-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('collection-private-profile-hint')).not.toBeInTheDocument();

    // Selecting Somente Eu while show_on_profile is ON displays owner-only subtle hint
    await user.click(screen.getByRole('button', { name: /Somente Eu/i }));
    expect(screen.getByTestId('collection-private-profile-hint')).toBeInTheDocument();

    // Switch back to Público and submit
    await user.click(screen.getByRole('button', { name: /Público/i }));
    await user.type(screen.getByLabelText('Nome da coleção'), 'Clutches de AWP');
    await user.click(screen.getByRole('button', { name: 'CRIAR COLEÇÃO' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Clutches de AWP',
          privacy: 'public',
          show_on_profile: true,
        }),
      );
    });
  });

  it('shows Coleções tab with privacy badges and hidden-for-visitors banner when owner views own profile with private global ceiling', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot({ collections_visibility: 'private' });

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValue({
      ...BASE_PROFILE,
      collections_visibility: 'private',
    });
    vi.spyOn(userService, 'listUserClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
    });
    const listColsSpy = vi.spyOn(userService, 'listUserCollections').mockResolvedValue({
      items: PROFILE_COLLECTIONS,
      page: 1,
      page_size: 12,
      total: 2,
      total_pages: 1,
    });

    renderWithProviders(<PublicProfileView username="fallen_br" />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Coleções/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Coleções/i }));

    await waitFor(() => {
      expect(listColsSpy).toHaveBeenCalledWith('fallen_br', { page: 1, page_size: 12 });
    });

    expect(screen.getByTestId('owner-private-collections-banner')).toBeInTheDocument();
    expect(screen.getByTestId('profile-collection-card-col-public')).toHaveAttribute(
      'href',
      '/collections/col-public',
    );
    expect(screen.getByTestId('collection-privacy-badge-col-public')).toHaveTextContent('Público');
    expect(screen.getByTestId('collection-privacy-badge-col-friends')).toHaveTextContent(
      'Somente Eu',
    );
  });

  it('shows Coleções tab for logged-in friend when profile global ceiling is friends (without owner badges)', async () => {
    const user = userEvent.setup();
    mockAuthenticatedBoot(FRIEND_USER);

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValue({
      ...BASE_PROFILE,
      collections_visibility: 'friends',
    });
    vi.spyOn(userService, 'listUserClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
    });
    const listColsSpy = vi.spyOn(userService, 'listUserCollections').mockResolvedValue({
      items: [PROFILE_COLLECTIONS[0]!],
      page: 1,
      page_size: 12,
      total: 1,
      total_pages: 1,
    });

    renderWithProviders(<PublicProfileView username="fallen_br" />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Coleções/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Coleções/i }));

    await waitFor(() => {
      expect(listColsSpy).toHaveBeenCalledOnce();
    });
    expect(screen.getByText('Clutches de AWP')).toBeInTheDocument();
    expect(screen.queryByTestId('collection-privacy-badge-col-public')).not.toBeInTheDocument();
    expect(screen.queryByTestId('owner-private-collections-banner')).not.toBeInTheDocument();
  });

  it('hides Coleções tab for non-owner when profile global visibility is private', async () => {
    mockAnonymousBoot();

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValue({
      ...BASE_PROFILE,
      collections_visibility: 'private',
    });
    vi.spyOn(userService, 'listUserClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
    });
    const listColsSpy = vi.spyOn(userService, 'listUserCollections');

    renderWithProviders(<PublicProfileView username="fallen_br" />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Clipes/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('tab', { name: /Coleções/i })).not.toBeInTheDocument();
    expect(listColsSpy).not.toHaveBeenCalled();
  });

  it('shows login gate with ENTRAR PARA VER for anonymous visitor when profile global visibility is friends', async () => {
    const user = userEvent.setup();
    mockAnonymousBoot();

    vi.spyOn(userService, 'getPublicProfile').mockResolvedValue({
      ...BASE_PROFILE,
      collections_visibility: 'friends',
    });
    vi.spyOn(userService, 'listUserClips').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
    });
    const listColsSpy = vi.spyOn(userService, 'listUserCollections');

    renderWithProviders(<PublicProfileView username="fallen_br" />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Coleções/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Coleções/i }));

    expect(screen.getByTestId('profile-collections-friends-gate')).toBeInTheDocument();
    const loginLink = screen.getByRole('link', { name: /ENTRAR PARA VER/i });
    expect(loginLink).toHaveAttribute('href', '/login');
    expect(listColsSpy).not.toHaveBeenCalled();
  });

  it('renders CollectionDetailView clips grid, 401 login gate and 403 private state', async () => {
    // 1. Ready state with clips
    mockAnonymousBoot();
    vi.spyOn(collectionsService, 'getCollection').mockResolvedValueOnce({
      ...PROFILE_COLLECTIONS[0]!,
      clips: [
        {
          position: 0,
          added_at: '2026-11-21T22:00:00Z',
          clip: {
            id: 'clip-1',
            slug: 'clutch-awp-mirage',
            title: 'Clutch 1v4 de AWP',
            thumbnail_url: 'https://cdn.clipai.com.br/thumbs/c1.webp',
            duration_seconds: 32,
            views_count: 140,
            likes_count: 25,
          },
        },
      ],
      page: 1,
      page_size: 12,
      total_pages: 1,
    });

    const { unmount } = renderWithProviders(<CollectionDetailView collectionId="col-public" />);

    await waitFor(() => {
      expect(screen.getByTestId('collection-detail-header')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Clutches de AWP' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Clutch 1v4 de AWP/i })).toHaveAttribute(
      'href',
      '/c/clutch-awp-mirage',
    );
    unmount();

    // 2. 401 unauthorized state
    mockAnonymousBoot();
    vi.spyOn(collectionsService, 'getCollection').mockRejectedValueOnce(
      new ApiClientError({
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Faça login para visualizar.',
      }),
    );

    const { unmount: unmount401 } = renderWithProviders(
      <CollectionDetailView collectionId="col-friends" />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('collection-unauthorized-state')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /ENTRAR PARA VER/i })).toHaveAttribute(
      'href',
      '/login',
    );
    unmount401();

    // 3. 403 forbidden state
    mockAuthenticatedBoot(FRIEND_USER);
    vi.spyOn(collectionsService, 'getCollection').mockRejectedValueOnce(
      new ApiClientError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para acessar esta coleção.',
      }),
    );

    renderWithProviders(<CollectionDetailView collectionId="col-private" />);
    await waitFor(() => {
      expect(screen.getByTestId('collection-forbidden-state')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Você não tem permissão para acessar esta coleção.'),
    ).toBeInTheDocument();
  });
});
