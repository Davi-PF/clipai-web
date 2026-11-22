import { ClipDetailView } from '@/components/player/ClipDetailView';

export default async function ClipSharePage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  return <ClipDetailView slug={slug} />;
}
