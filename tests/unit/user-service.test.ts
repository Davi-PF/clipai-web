import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/lib/api-client';
import * as r2UploadModule from '@/lib/r2-upload';
import { userService } from '@/services/user-service';

describe('user-service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('user_jwt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('updates profile, uploads avatar to R2 and confirms upload', async () => {
    const uploadSpy = vi
      .spyOn(r2UploadModule, 'uploadFileToPresignedUrl')
      .mockImplementation(async (_url, _file, _ct, onProgress) => {
        onProgress(50);
        onProgress(100);
      });

    fetchMock
      // updateProfile
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'Professor FalleN',
            bio: 'AWPer do CS2.',
            avatar_url: null,
            avatar_source: 'none',
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      // createAvatarUploadUrl
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            avatar_key: 'avatars/u1/avatar-1.webp',
            object_key: 'avatars/u1/avatar-1.webp',
            upload_url: 'https://r2.clipai.com.br/avatars/u1/avatar-1.webp',
            expires_in: 600,
            avatar_upload: {
              url: 'https://r2.clipai.com.br/avatars/u1/avatar-1.webp',
              method: 'PUT',
              headers: { 'Content-Type': 'image/webp' },
            },
          }),
          { status: 200 },
        ),
      )
      // confirmAvatarUpload
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'Professor FalleN',
            bio: 'AWPer do CS2.',
            avatar_url: 'https://cdn.clipai.com.br/avatars/u1/avatar-1.webp',
            avatar_source: 'custom',
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      );

    const updated = await userService.updateProfile({
      display_name: 'Professor FalleN',
      bio: 'AWPer do CS2.',
    });
    expect(updated.display_name).toBe('Professor FalleN');

    const progressValues: number[] = [];
    const file = new File(['webp-data'], 'avatar.webp', { type: 'image/webp' });
    const withAvatar = await userService.uploadAvatar(file, (pct) => progressValues.push(pct));

    expect(uploadSpy).toHaveBeenCalledOnce();
    expect(progressValues).toEqual([50, 100]);
    expect(withAvatar.avatar_source).toBe('custom');
    expect(withAvatar.avatar_url).toBe('https://cdn.clipai.com.br/avatars/u1/avatar-1.webp');
  });

  it('handles Discord link URL, useDiscordAvatar, unlinkDiscord and public profile endpoints', async () => {
    fetchMock
      // getMe
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      // getDiscordLinkUrl
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: 'https://discord.com/api/oauth2/authorize?state=link_state',
            authorization_url: 'https://discord.com/api/oauth2/authorize?state=link_state',
            state: 'link_state',
            mode: 'link',
          }),
          { status: 200 },
        ),
      )
      // useDiscordAvatar
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: 'https://cdn.discordapp.com/avatars/1/disc.png',
            avatar_source: 'discord',
            discord_linked: true,
            discord_username: 'fallen_disc',
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      // unlinkDiscord
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: null,
            avatar_source: 'none',
            discord_linked: false,
            discord_username: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      // getPublicProfile
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            display_name: 'FalleN',
            bio: 'Professor do CS2.',
            avatar_url: 'https://cdn.clipai.com.br/avatars/u1.webp',
            discord_linked: true,
            discord_username: 'fallen_disc',
            clips_count: 5,
            total_views: 420,
            total_likes: 64,
            created_at: '2026-11-21T20:00:00Z',
          }),
          { status: 200 },
        ),
      )
      // listUserClips
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            page_size: 12,
            total: 0,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      )
      // listUserCollections
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            page_size: 10,
            total: 0,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      );

    const me = await userService.getMe();
    expect(me.username).toBe('fallen_br');

    const linkUrl = await userService.getDiscordLinkUrl();
    expect(linkUrl.mode).toBe('link');

    const withDiscordAvatar = await userService.useDiscordAvatar();
    expect(withDiscordAvatar.avatar_source).toBe('discord');

    const unlinked = await userService.unlinkDiscord();
    expect(unlinked.discord_linked).toBe(false);

    const pub = await userService.getPublicProfile('fallen_br');
    expect(pub.discord_username).toBe('fallen_disc');

    const clips = await userService.listUserClips('fallen_br', {
      page: 1,
      page_size: 12,
      privacy: 'public',
    });
    expect(clips.items).toEqual([]);

    const collections = await userService.listUserCollections('fallen_br', {
      page: 1,
      page_size: 10,
    });
    expect(collections.items).toEqual([]);
  });

  it('updates global collections_visibility via updateProfile and updateCollectionsVisibility', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: null,
            collections_visibility: 'friends',
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'FalleN',
            avatar_url: null,
            collections_visibility: 'private',
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      );

    const viaProfile = await userService.updateProfile({ collections_visibility: 'friends' });
    expect(viaProfile.collections_visibility).toBe('friends');
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ collections_visibility: 'friends' }),
      }),
    );

    const viaHelper = await userService.updateCollectionsVisibility('private');
    expect(viaHelper.collections_visibility).toBe('private');
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ collections_visibility: 'private' }),
      }),
    );
  });
});
