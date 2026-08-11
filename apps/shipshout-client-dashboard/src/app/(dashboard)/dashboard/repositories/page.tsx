import { Box, Stack, Text } from '@chakra-ui/react';
import type { Metadata } from 'next';
import type { SearchParams } from 'next/dist/server/request/search-params';
import { getRepositoriesApi } from '../../../../lib/repositories/api';
import { RepositoriesClient } from '../../../../components/repositories/repositories-client';

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

export const metadata: Metadata = {
    title: 'Repositories',
};

export default async function RepositoriesPage({ searchParams }: { searchParams: SearchParams }) {
    const publicApiBaseUrl = process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? process.env.SHIPSHOUT_API_URL;
    if (!publicApiBaseUrl) throw new Error('NEXT_PUBLIC_SHIPSHOUT_API_URL is not set');

    const connectUrl = `${normalizeBaseUrl(publicApiBaseUrl)}/repositories/github/connect`;

    const githubQuery = typeof searchParams.github === 'string' ? searchParams.github : undefined;
    const githubReason = typeof searchParams.reason === 'string' ? searchParams.reason : undefined;

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
                <Text fontSize="xs" fontWeight="600" color="brand.fg" letterSpacing="0.125px" textTransform="uppercase">
                    Repositories
                </Text>
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

