import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/lib/api-client';
import { clipsService } from '@/services/clips-service';
import { collectionsService } from '@/services/collections-service';

describe('collections-service & social clips-service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('jwt_sprint3');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('performs full CRUD and clip membership operations on collectionsService', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'col-1', title: 'Clutches CS2', clips_count: 2 }],
            page: 1,
            page_size: 12,
            total: 1,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'col-1', title: 'Clutches CS2', clips_count: 2 }],
            page: 1,
            page_size: 12,
            total: 1,
            total_pages: 1,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'col-1',
            title: 'Clutches CS2',
            clips_count: 1,
            clips: [
              { position: 0, added_at: '2026-11-22T00:00:00Z', clip: { id: 'c1', title: 'Ace' } },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'col-2', title: 'Highlights Valorant', clips_count: 0 }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'col-2', title: 'Highlights Valorant 2026', clips_count: 0 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            collection_id: 'col-2',
            clip_id: 'c1',
            position: 0,
            added_at: '2026-11-22T00:05:00Z',
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const listed = await collectionsService.listCollections({ mine: true, page_size: 12 });
    expect(listed.items[0]?.id).toBe('col-1');

    const userCols = await collectionsService.listUserCollections('fallen_br', { page: 1 });
    expect(userCols.items).toHaveLength(1);

    const detail = await collectionsService.getCollection('col-1');
    expect(detail.clips[0]?.clip.id).toBe('c1');

    const created = await collectionsService.createCollection({
      title: 'Highlights Valorant',
      privacy: 'public',
      accent_color: '#2EB886',
    });
    expect(created.id).toBe('col-2');

    const updated = await collectionsService.updateCollection('col-2', {
      title: 'Highlights Valorant 2026',
    });
    expect(updated.title).toBe('Highlights Valorant 2026');

    const added = await collectionsService.addClipToCollection('col-2', 'c1', 0);
    expect(added.clip_id).toBe('c1');

    await expect(
      collectionsService.removeClipFromCollection('col-2', 'c1'),
    ).resolves.toBeUndefined();
    await expect(collectionsService.deleteCollection('col-2')).resolves.toBeUndefined();
  });

  it('toggles like and favorite and supports favorited, collection_id and sort filters', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ clip_id: 'c1', liked: true, is_liked_by_me: true, likes_count: 11 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ clip_id: 'c1', liked: false, is_liked_by_me: false, likes_count: 10 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            clip_id: 'c1',
            favorited: true,
            is_favorited_by_me: true,
            favorites_count: 4,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            clip_id: 'c1',
            favorited: false,
            is_favorited_by_me: false,
            favorites_count: 3,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [], page: 1, page_size: 6, total: 0, total_pages: 0 }),
          { status: 200 },
        ),
      );

    const liked = await clipsService.toggleLike('c1', false);
    expect(liked.likes_count).toBe(11);

    const unliked = await clipsService.toggleLike('c1', true);
    expect(unliked.likes_count).toBe(10);

    const fav = await clipsService.toggleFavorite('c1', false);
    expect(fav.favorites_count).toBe(4);

    const unfav = await clipsService.toggleFavorite('c1', true);
    expect(unfav.favorites_count).toBe(3);

    await clipsService.listClips({
      favorited: true,
      collection_id: 'col-1',
      sort: 'popular',
      page: 1,
      page_size: 6,
    });

    const lastCallUrl = String(fetchMock.mock.calls[4]?.[0]);
    expect(lastCallUrl).toContain('favorited=true');
    expect(lastCallUrl).toContain('collection_id=col-1');
    expect(lastCallUrl).toContain('sort=popular');
  });
});
