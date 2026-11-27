import { CollectionDetailView } from '@/components/collections/CollectionDetailView';

export default async function CollectionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  return <CollectionDetailView collectionId={id} />;
}
