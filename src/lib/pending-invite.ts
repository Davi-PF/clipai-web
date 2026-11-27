import { invitesService } from '@/services/invites-service';
import type { InviteAcceptResponse } from '@/types/invite';

export const PENDING_INVITE_STORAGE_KEY = 'clipai_pending_invite_code';

function normalizeInviteCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export function savePendingInviteCode(code: string): void {
  const normalized = normalizeInviteCode(code);
  if (!normalized || typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

export function getPendingInviteCode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return normalizeInviteCode(window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearPendingInviteCode(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getInviteCodeFromSearch(search?: string): string | null {
  const rawSearch = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  if (!rawSearch) {
    return null;
  }
  const params = new URLSearchParams(rawSearch);
  return normalizeInviteCode(params.get('invite'));
}

export function capturePendingInviteCode(search?: string): string | null {
  const fromUrl = getInviteCodeFromSearch(search);
  if (fromUrl) {
    savePendingInviteCode(fromUrl);
    return fromUrl;
  }
  return getPendingInviteCode();
}

export async function acceptPendingInviteIfPresent(
  search?: string,
): Promise<InviteAcceptResponse | null> {
  const pendingCode = capturePendingInviteCode(search);
  if (!pendingCode) {
    return null;
  }

  try {
    return await invitesService.acceptInvite(pendingCode);
  } catch {
    return null;
  } finally {
    clearPendingInviteCode();
  }
}
