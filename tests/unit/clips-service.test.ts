import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/lib/api-client';
import { clipsService } from '@/services/clips-service';

describe('clips-service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('lists games and tags with query parameters', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'g1', name: 'Counter-Strike 2', slug: 'counter-strike-2' }],
            page: 1,
            page_size: 20,
            total: 1,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: 't1', name: 'clutch', slug: 'clutch' }] }), {
          status: 200,
        }),
      );

    const gamesRes = await clipsService.listGames({ q: 'Counter', page_size: 20 });
    expect(gamesRes.items[0]?.slug).toBe('counter-strike-2');

    const tagsRes = await clipsService.listTags({ q: 'cl', limit: 10 });
    expect(tagsRes.items[0]?.slug).toBe('clutch');
  });

  it('requests presigned URLs, confirms upload and manages clip CRUD', async () => {
    setAccessToken('jwt_user');

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            clip_id: 'clip-1',
            status: 'pending_upload',
            expires_in: 900,
            video_upload: {
              url: 'https://r2.example.com/v',
              method: 'PUT',
              headers: { 'Content-Type': 'video/mp4', 'Content-Length': '1000' },
            },
            thumbnail_upload: {
              url: 'https://r2.example.com/t',
              method: 'PUT',
              headers: { 'Content-Type': 'image/webp', 'Content-Length': '200' },
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'clip-1', status: 'ready', title: 'Ace' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'clip-1', title: 'Ace' }],
            page: 1,
            page_size: 20,
            total: 1,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'clip-1', title: 'Ace' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'clip-1', title: 'Ace Editado' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clip_id: 'clip-1', views_count: 10 }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const uploadRes = await clipsService.requestUploadUrl({
      title: 'Ace',
      game_id: 'g1',
      privacy: 'public',
      tags: ['ace'],
      video_mime_type: 'video/mp4',
      video_size_bytes: 1000,
      duration_seconds: 15,
      thumbnail_mime_type: 'image/webp',
      thumbnail_size_bytes: 200,
      technical_metadata: {
        container: 'mp4',
        width: 1920,
        height: 1080,
        resolution_label: '1080p',
        aspect_ratio: '16:9',
      },
    });
    expect(uploadRes.clip_id).toBe('clip-1');

    const confirmed = await clipsService.confirmUpload('clip-1');
    expect(confirmed.status).toBe('ready');

    const listed = await clipsService.listClips({ q: 'Ace', game_id: 'g1' });
    expect(listed.items).toHaveLength(1);

    const fetched = await clipsService.getClipBySlug('clip-1');
    expect(fetched.title).toBe('Ace');

    const updated = await clipsService.updateClip('clip-1', { title: 'Ace Editado' });
    expect(updated.title).toBe('Ace Editado');

    const view = await clipsService.registerView('clip-1');
    expect(view.views_count).toBe(10);

    await expect(clipsService.deleteClip('clip-1')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: 'clip-2', title: 'Privado' }],
          page: 1,
          page_size: 20,
          total: 1,
          total_pages: 1,
        }),
        { status: 200 },
      ),
    );
    const userClips = await clipsService.listUserClips('fallen_br', { privacy: 'unlisted' });
    expect(userClips.items[0]?.id).toBe('clip-2');
  });
});
