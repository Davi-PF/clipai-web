'use client';

import { useEffect, useState } from 'react';
import { getUserDisplayName, getUserInitials } from '@/types/user';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface UserAvatarProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  showOnlineStatus?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xs: 'h-4 w-4 text-[8px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export function UserAvatar({
  username,
  displayName,
  avatarUrl,
  size = 'md',
  showOnlineStatus = false,
  className = '',
}: Readonly<UserAvatarProps>) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [avatarUrl]);

  const effectiveName = getUserDisplayName({ username, display_name: displayName });
  const initials = getUserInitials({ username, display_name: displayName });
  const shouldRenderImage = Boolean(avatarUrl && !hasImageError);

  return (
    <div
      className={`relative flex shrink-0 select-none items-center justify-center rounded-full border border-border-muted bg-bg-deep font-mono font-bold uppercase leading-none text-text-primary ${SIZE_CLASSES[size]} ${className}`.trim()}
    >
      {shouldRenderImage ? (
        <img
          src={avatarUrl!}
          alt={`Avatar de ${effectiveName}`}
          onError={() => setHasImageError(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="inline-flex items-center justify-center leading-none">{initials}</span>
      )}

      {showOnlineStatus && (
        <span
          title="Online"
          aria-label="Status online"
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-surface bg-success"
        />
      )}
    </div>
  );
}
