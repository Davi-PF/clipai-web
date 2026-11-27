import type {
  AvatarConfirmRequest,
  AvatarMimeType,
  AvatarPresignedTarget,
  AvatarSource,
  AvatarUploadUrlRequest,
  AvatarUploadUrlResponse,
  ClipAuthorSummary,
  CollectionVisibility,
  PublicProfile,
  PublicUserProfile,
  User,
  UserPublicStats,
  UserUpdateRequest,
} from '@/types/api';

export type {
  AvatarConfirmRequest,
  AvatarMimeType,
  AvatarPresignedTarget,
  AvatarSource,
  AvatarUploadUrlRequest,
  AvatarUploadUrlResponse,
  ClipAuthorSummary,
  CollectionVisibility,
  PublicProfile,
  PublicUserProfile,
  User,
  UserPublicStats,
  UserUpdateRequest,
};

export function getUserDisplayName(
  user: Pick<User, 'username'> & { display_name?: string | null },
): string {
  const trimmed = user.display_name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : user.username;
}

export function getUserInitials(
  user: Pick<User, 'username'> & { display_name?: string | null },
): string {
  const source = getUserDisplayName(user);
  return source.slice(0, 2).toUpperCase();
}
