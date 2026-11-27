import type { Metadata } from 'next';
import { InviteLandingView } from '@/components/invites/InviteLandingView';
import { resolveApiUrl } from '@/lib/api-client';
import type { InvitePreview } from '@/types/invite';

const INVITE_OG_DESCRIPTION =
  'Entre pelo convite para virar amigo automaticamente e assistir clipes exclusivos da call.';

async function fetchInvitePreviewForMetadata(code: string): Promise<InvitePreview | null> {
  const safeCode = encodeURIComponent(code.trim());
  if (!safeCode) {
    return null;
  }

  try {
    const response = await fetch(resolveApiUrl(`/api/v1/invites/${safeCode}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as InvitePreview;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ code: string }>;
}>): Promise<Metadata> {
  const { code } = await params;
  const preview = await fetchInvitePreviewForMetadata(code);

  const inviterName = preview?.display_name?.trim() || preview?.username?.trim() || null;
  const title = inviterName ? `Convite de ${inviterName} para o CLIPAÍ` : 'Convite para o CLIPAÍ';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  const inviteUrl = appUrl ? `${appUrl}/invite/${encodeURIComponent(code)}` : undefined;
  const images = preview?.avatar_url
    ? [{ url: preview.avatar_url, alt: `Avatar de ${inviterName ?? 'jogador'}` }]
    : undefined;

  return {
    title,
    description: INVITE_OG_DESCRIPTION,
    openGraph: {
      title,
      description: INVITE_OG_DESCRIPTION,
      type: 'website',
      locale: 'pt_BR',
      siteName: 'CLIPAÍ',
      url: inviteUrl,
      images,
    },
    twitter: {
      card: 'summary',
      title,
      description: INVITE_OG_DESCRIPTION,
      images: preview?.avatar_url ? [preview.avatar_url] : undefined,
    },
  };
}

export default async function InvitePage({
  params,
}: Readonly<{
  params: Promise<{ code: string }>;
}>) {
  const { code } = await params;
  return <InviteLandingView code={code} />;
}
