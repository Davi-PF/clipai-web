import { describe, expect, it } from 'vitest';
import {
  compareHighlightClips,
  getTopHighlightClipId,
  hasHighlightEngagement,
  MAX_HIGHLIGHT_CLIPS,
  selectHighlightClips,
  type HighlightRankableClip,
} from '@/lib/highlight-ranking';

function makeClip(
  overrides: Partial<HighlightRankableClip> & { id: string },
): HighlightRankableClip {
  return {
    favorites_count: 0,
    likes_count: 0,
    views_count: 0,
    created_at: '2026-11-20T12:00:00Z',
    ...overrides,
  };
}

describe('highlight-ranking', () => {
  it('detects highlight engagement only when favorites_count > 0 or views_count > 0', () => {
    expect(hasHighlightEngagement(makeClip({ id: 'zero' }))).toBe(false);
    expect(hasHighlightEngagement(makeClip({ id: 'fav-only', favorites_count: 1 }))).toBe(true);
    expect(hasHighlightEngagement(makeClip({ id: 'view-only', views_count: 1 }))).toBe(true);
  });

  it('orders by favorites_count desc, then views_count desc, then most recent created_at, then likes_count desc', () => {
    const olderTied = makeClip({
      id: 'older-tied',
      favorites_count: 5,
      views_count: 120,
      likes_count: 20,
      created_at: '2026-11-20T10:00:00Z',
    });
    const newerTied = makeClip({
      id: 'newer-tied',
      favorites_count: 5,
      views_count: 120,
      likes_count: 4,
      created_at: '2026-11-25T10:00:00Z',
    });
    const moreViews = makeClip({
      id: 'more-views',
      favorites_count: 5,
      views_count: 250,
      created_at: '2026-11-18T10:00:00Z',
    });
    const mostFavorites = makeClip({
      id: 'most-favorites',
      favorites_count: 9,
      views_count: 30,
      created_at: '2026-11-10T10:00:00Z',
    });
    const sameTimestampLowLikes = makeClip({
      id: 'same-ts-low-likes',
      favorites_count: 5,
      views_count: 120,
      likes_count: 1,
      created_at: '2026-11-25T10:00:00Z',
    });

    const sorted = [olderTied, sameTimestampLowLikes, moreViews, newerTied, mostFavorites].sort(
      compareHighlightClips,
    );

    expect(sorted.map((clip) => clip.id)).toEqual([
      'most-favorites',
      'more-views',
      'newer-tied',
      'same-ts-low-likes',
      'older-tied',
    ]);
  });

  it('breaks ties safely when created_at is invalid', () => {
    const invalidDateClip = makeClip({
      id: 'invalid-date',
      favorites_count: 2,
      views_count: 50,
      created_at: 'not-a-date',
    });
    const validDateClip = makeClip({
      id: 'valid-date',
      favorites_count: 2,
      views_count: 50,
      created_at: '2026-11-21T12:00:00Z',
    });

    const sorted = [invalidDateClip, validDateClip].sort(compareHighlightClips);
    expect(sorted.map((clip) => clip.id)).toEqual(['valid-date', 'invalid-date']);
  });

  it('filters out zero-engagement clips, caps results at MAX_HIGHLIGHT_CLIPS (Top 10) and preserves input immutability', () => {
    const input: HighlightRankableClip[] = [
      makeClip({ id: 'no-engagement', favorites_count: 0, views_count: 0 }),
      ...Array.from({ length: 12 }, (_, index) =>
        makeClip({
          id: `clip-${index + 1}`,
          favorites_count: index + 1,
          views_count: (index + 1) * 10,
          created_at: `2026-11-${String(index + 10).padStart(2, '0')}T12:00:00Z`,
        }),
      ),
    ];
    const snapshotIds = input.map((clip) => clip.id);

    const highlights = selectHighlightClips(input);

    expect(highlights).toHaveLength(MAX_HIGHLIGHT_CLIPS);
    expect(highlights[0]?.id).toBe('clip-12');
    expect(highlights.at(-1)?.id).toBe('clip-3');
    expect(highlights.some((clip) => clip.id === 'no-engagement')).toBe(false);
    expect(input.map((clip) => clip.id)).toEqual(snapshotIds);
  });

  it('returns null from getTopHighlightClipId when no clip has engagement and #1 id otherwise', () => {
    expect(
      getTopHighlightClipId([
        makeClip({ id: 'zero-1', favorites_count: 0, views_count: 0 }),
        makeClip({ id: 'zero-2', favorites_count: 0, views_count: 0 }),
      ]),
    ).toBeNull();

    expect(
      getTopHighlightClipId([
        makeClip({
          id: 'older-winner',
          favorites_count: 3,
          views_count: 80,
          created_at: '2026-11-20T10:00:00Z',
        }),
        makeClip({
          id: 'newer-winner',
          favorites_count: 3,
          views_count: 80,
          created_at: '2026-11-24T10:00:00Z',
        }),
      ]),
    ).toBe('newer-winner');
  });
});
