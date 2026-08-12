import { Box, Stack } from '@chakra-ui/react';
import { FolderGit2 } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../../components/dashboard/page-header';
import { RepositoryDetailClient } from '../../../../../components/repositories/repository-detail-client';
import { fetchRepositoryDetail, fetchRepositoryEvents } from '../../../../../lib/triggers/api';

export const metadata: Metadata = {
    title: 'Repository triggers',
};

export default async function RepositoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [detailRes, eventsRes] = await Promise.all([fetchRepositoryDetail(id), fetchRepositoryEvents(id)]);

    if (detailRes.status === 404) notFound();
    if (!detailRes.data) throw new Error('Failed to load repository detail');

    const events = eventsRes.data?.events ?? [];

    return (
        <Box>
            <Stack maxW="960px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
                <PageHeader icon={FolderGit2} eyebrow="Repositories" title="Trigger setup" description="Configure GitHub events and webhook delivery for this repository." />
                <RepositoryDetailClient repository={detailRes.data} events={events} />
            </Stack>
        </Box>
    );
}
