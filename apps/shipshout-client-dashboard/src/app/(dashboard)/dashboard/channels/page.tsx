import { Stack } from '@chakra-ui/react';
import { Radio } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/page-header';
import { ChannelsClient } from '@/components/channels/channels-client';
import { ChannelsApi } from '@/lib/channels/channels.api';
import { RepositoriesApi } from '@/lib/repositories/repositories.api';
import { ShipshoutApi } from '@/lib/shipshout.api';

export const metadata: Metadata = {
    title: 'Channels',
};

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
    const params = await searchParams;
    const initialRepoId = typeof params.repo === 'string' ? params.repo : undefined;

    const { api, requestOptions } = await RepositoriesApi.getClient();
    const [catalogRes, linkedRes] = await Promise.all([ChannelsApi.fetchCatalog(), api.listLinkedRepos(requestOptions)]);

    if (!catalogRes.data) {
        const detail = ShipshoutApi.errorMessage(catalogRes.error, 'Failed to load channel catalog');
        throw new Error(`${detail} (${catalogRes.status})`);
    }

    const catalog = catalogRes.data.channels;
    const linkedRepos = (linkedRes.data?.repositories ?? []).map((repo) => ({ id: repo.id, fullName: repo.fullName }));

    const channelsByRepoEntries = await Promise.all(
        linkedRepos.map(async (repo) => {
            const result = await ChannelsApi.fetchRepositoryChannels(repo.id);
            return [repo.id, result.data?.channels ?? []] as const;
        }),
    );
    const channelsByRepo = Object.fromEntries(channelsByRepoEntries);

    return (
        <Stack gap="lg">
            <PageHeader
                icon={Radio}
                eyebrow="Channels"
                title="Channel marketplace"
                description="Browse delivery channels and configure where shoutouts go for each repository. Notification channels alert you; publish channels reach your audience when you publish."
            />
            <ChannelsClient catalog={catalog} linkedRepos={linkedRepos} channelsByRepo={channelsByRepo} initialRepoId={initialRepoId} />
        </Stack>
    );
}
