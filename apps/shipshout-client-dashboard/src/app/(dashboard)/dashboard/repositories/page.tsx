import { Box, Stack } from '@chakra-ui/react';
import { FolderGit2 } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '../../../../components/dashboard/page-header';
import { RepositoriesClient } from '../../../../components/repositories/repositories-client';
import { getRepositoriesApi } from '../../../../lib/repositories/api';

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

export const metadata: Metadata = {
    title: 'Repositories',
};

export default async function RepositoriesPage({ searchParams }: { searchParams: Promise<{ github?: string; reason?: string }> }) {
    const publicApiBaseUrl = process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? process.env.SHIPSHOUT_API_URL;
    if (!publicApiBaseUrl) throw new Error('NEXT_PUBLIC_SHIPSHOUT_API_URL is not set');

    const connectUrl = `${normalizeBaseUrl(publicApiBaseUrl)}/repositories/github/connect`;

    const params = await searchParams;
    const githubQuery = typeof params.github === 'string' ? params.github : undefined;
    const githubReason = typeof params.reason === 'string' ? params.reason : undefined;

    const { api, requestOptions } = await getRepositoriesApi();

    const [connectionRes, availableRes, linkedRes] = await Promise.all([
        api.getGithubConnection(requestOptions),
        api.listAvailableRepos(requestOptions),
        api.listLinkedRepos(requestOptions),
    ]);

    const connection = (connectionRes as any)?.data ?? { connected: false };
    const available = (availableRes as any)?.data?.repositories ?? [];
    const linked = (linkedRes as any)?.data?.repositories ?? [];

    return (
        <Box>
            <Stack maxW="1080px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
                <PageHeader
                    icon={FolderGit2}
                    eyebrow="Repositories"
                    title="Repositories"
                    description="Connect GitHub and link the repos you want to shout about."
                />
                <RepositoriesClient
                    connection={connection}
                    available={available}
                    linked={linked}
                    connectUrl={connectUrl}
                    githubQuery={githubQuery}
                    githubReason={githubReason}
                />
            </Stack>
        </Box>
    );
}
