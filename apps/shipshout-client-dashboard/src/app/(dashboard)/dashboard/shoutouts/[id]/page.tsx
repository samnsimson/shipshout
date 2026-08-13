import { Stack } from '@chakra-ui/react';
import { Megaphone } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { ShoutoutDetailClient } from '@/components/shoutouts/shoutout-detail-client';
import { ShoutoutsApi } from '@/lib/shoutouts/shoutouts.api';

export const metadata: Metadata = {
    title: 'Shoutout detail',
};

export default async function ShoutoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await ShoutoutsApi.fetchById(id);
    if (result.response?.status === 404) notFound();
    if (!result.data) throw new Error('Failed to load shoutout');

    return (
        <Stack gap="lg">
            <PageHeader icon={Megaphone} eyebrow="Shoutouts" title="Shoutout detail" />
            <ShoutoutDetailClient shoutout={result.data} />
        </Stack>
    );
}
