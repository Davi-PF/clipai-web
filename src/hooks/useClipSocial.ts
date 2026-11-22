'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/contexts/toast-context';
import { ApiClientError } from '@/lib/api-client';
import { clipsService } from '@/services/clips-service';
import { isClipFavorited, isClipLiked, type ClipSummary } from '@/types/clip';

export interface SocialMutationPatch {
  likes_count?: number;
  favorites_count?: number;
  is_liked?: boolean;
  is_liked_by_me?: boolean;
  is_favorited?: boolean;
  is_favorited_by_me?: boolean;
}

export function useClipSocial(onPatchClip: (clipId: string, patch: SocialMutationPatch) => void) {
  const { error: showErrorToast } = useToast();
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(() => new Set());
  const [pendingFavorites, setPendingFavorites] = useState<Set<string>>(() => new Set());

  const toggleLike = useCallback(
    async (clip: ClipSummary) => {
      if (pendingLikes.has(clip.id)) {
        return;
      }

      const prevLiked = isClipLiked(clip);
      const prevCount = clip.likes_count;
      const nextLiked = !prevLiked;
      const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

      setPendingLikes((prev) => new Set(prev).add(clip.id));
      onPatchClip(clip.id, {
        is_liked: nextLiked,
        is_liked_by_me: nextLiked,
        likes_count: nextCount,
      });

      try {
        const res = await clipsService.toggleLike(clip.id, prevLiked);
        const resolvedLiked = Boolean(res.liked ?? res.is_liked_by_me);
        onPatchClip(clip.id, {
          is_liked: resolvedLiked,
          is_liked_by_me: resolvedLiked,
          likes_count: res.likes_count,
        });
      } catch (err: unknown) {
        onPatchClip(clip.id, {
          is_liked: prevLiked,
          is_liked_by_me: prevLiked,
          likes_count: prevCount,
        });
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível atualizar a curtida. Tente novamente.';
        showErrorToast(message);
      } finally {
        setPendingLikes((prev) => {
          const next = new Set(prev);
          next.delete(clip.id);
          return next;
        });
      }
    },
    [onPatchClip, pendingLikes, showErrorToast],
  );

  const toggleFavorite = useCallback(
    async (clip: ClipSummary) => {
      if (pendingFavorites.has(clip.id)) {
        return;
      }

      const prevFavorited = isClipFavorited(clip);
      const prevCount = clip.favorites_count;
      const nextFavorited = !prevFavorited;
      const nextCount = Math.max(0, prevCount + (nextFavorited ? 1 : -1));

      setPendingFavorites((prev) => new Set(prev).add(clip.id));
      onPatchClip(clip.id, {
        is_favorited: nextFavorited,
        is_favorited_by_me: nextFavorited,
        favorites_count: nextCount,
      });

      try {
        const res = await clipsService.toggleFavorite(clip.id, prevFavorited);
        const resolvedFavorited = Boolean(res.favorited ?? res.is_favorited_by_me);
        onPatchClip(clip.id, {
          is_favorited: resolvedFavorited,
          is_favorited_by_me: resolvedFavorited,
          favorites_count: res.favorites_count,
        });
      } catch (err: unknown) {
        onPatchClip(clip.id, {
          is_favorited: prevFavorited,
          is_favorited_by_me: prevFavorited,
          favorites_count: prevCount,
        });
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível atualizar os favoritos. Tente novamente.';
        showErrorToast(message);
      } finally {
        setPendingFavorites((prev) => {
          const next = new Set(prev);
          next.delete(clip.id);
          return next;
        });
      }
    },
    [onPatchClip, pendingFavorites, showErrorToast],
  );

  return {
    toggleLike,
    toggleFavorite,
    isLikePending: (clipId: string) => pendingLikes.has(clipId),
    isFavoritePending: (clipId: string) => pendingFavorites.has(clipId),
  };
}
