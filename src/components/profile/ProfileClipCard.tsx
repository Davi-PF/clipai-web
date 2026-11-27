'use client';

import Link from 'next/link';
import { Eye, Gamepad2, Heart } from 'lucide-react';
import { formatDurationBadge } from '@/lib/validators';

export interface ProfileClipCardProps {
  id: string;
  slug?: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewsCount: number;
  likesCount: number;
  gameName?: string | null;
}

export function ProfileClipCard({
  id,
  slug,
  title,
  thumbnailUrl,
  durationSeconds,
  viewsCount,
  likesCount,
  gameName,
}: Readonly<ProfileClipCardProps>) {
  const sharePath = `/c/${slug?.trim() || id}`;

  return (
    <Link
      href={sharePath}
      className="group flex flex-col overflow-hidden rounded-card border border-border-muted bg-bg-surface transition-colors hover:border-success"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-bg-deep">
        <img
          src={thumbnailUrl}
          alt={`Miniatura de ${title}`}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <span className="absolute bottom-2 right-2 rounded-control bg-bg-deep/90 px-2 py-0.5 font-mono text-mono-badge text-text-primary">
          {formatDurationBadge(durationSeconds)}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="space-y-1.5">
          {gameName && (
            <span className="inline-flex items-center gap-1 rounded-control border border-border-muted bg-bg-deep px-2 py-0.5 font-mono text-mono-badge uppercase text-success">
              <Gamepad2 className="h-3 w-3" aria-hidden="true" />
              {gameName}
            </span>
          )}
          <h3 className="line-clamp-2 font-mono text-mono-body font-semibold text-text-primary group-hover:text-success">
            {title}
          </h3>
        </div>

        <div className="flex items-center justify-between border-t border-border-muted pt-2.5 font-mono text-mono-badge text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {viewsCount} views
          </span>
          <span className="inline-flex items-center gap-1 text-danger">
            <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            {likesCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
