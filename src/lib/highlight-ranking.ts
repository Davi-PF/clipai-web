import type { ClipSummary } from '@/types/clip';

export const MAX_HIGHLIGHT_CLIPS = 10;

export type HighlightRankableClip = Pick<
  ClipSummary,
  'id' | 'favorites_count' | 'likes_count' | 'views_count' | 'created_at'
>;

function parseCreatedAtMs(createdAt: string): number {
  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function hasHighlightEngagement(clip: HighlightRankableClip): boolean {
  return clip.favorites_count > 0 || clip.views_count > 0;
}

export function compareHighlightClips(a: HighlightRankableClip, b: HighlightRankableClip): number {
  if (b.favorites_count !== a.favorites_count) {
    return b.favorites_count - a.favorites_count;
  }
  if (b.views_count !== a.views_count) {
    return b.views_count - a.views_count;
  }
  const createdDiff = parseCreatedAtMs(b.created_at) - parseCreatedAtMs(a.created_at);
  if (createdDiff !== 0) {
    return createdDiff;
  }
  return b.likes_count - a.likes_count;
}

export function selectHighlightClips<T extends HighlightRankableClip>(
  clips: readonly T[],
  limit = MAX_HIGHLIGHT_CLIPS,
): T[] {
  return [...clips]
    .filter(hasHighlightEngagement)
    .sort(compareHighlightClips)
    .slice(0, Math.max(0, limit));
}

export function getTopHighlightClipId(clips: readonly HighlightRankableClip[]): string | null {
  const topHighlight = selectHighlightClips(clips, 1)[0];
  return topHighlight ? topHighlight.id : null;
}
