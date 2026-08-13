import { Stack } from '@chakra-ui/react';
import { Radio } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { ChannelConfigClient } from '@/components/channels/channel-config-client';
import { ChannelsApi } from '@/lib/channels/channels.api';
import { AuthActions } from '@/lib/auth/auth.actions';
import { RepositoriesApi } from '@/lib/repositories/repositories.api';

export async function generateMetadata({ params }: { params: Promise<{ channelKey: string }> }): Promise<Metadata> {
    const { channelKey } = await params;
    const catalogRes = await ChannelsApi.fetchCatalog();
    const item = catalogRes.data?.channels.find((channel) => channel.key === channelKey);
    return { title: item ? `${item.displayName} configuration` : 'Channel configuration' };
}

export default async function ChannelConfigPage({
    params,
    searchParams,
}: {
    params: Promise<{ channelKey: string }>;
    searchParams: Promise<{ repo?: string }>;
}) {
    const { channelKey } = await params;
    const query = await searchParams;
    const repoId = typeof query.repo === 'string' ? query.repo : undefined;
    if (!repoId) redirect('/dashboard/channels');

    const { api, requestOptions } = await RepositoriesApi.getClient();
    const [catalogRes, channelsRes, linkedRes] = await Promise.all([
        ChannelsApi.fetchCatalog(),
        ChannelsApi.fetchRepositoryChannels(repoId),
        api.listLinkedRepos(requestOptions),
    ]);

    if (channelsRes.response?.status === 404) notFound();
    if (!catalogRes.data || !channelsRes.data) throw new Error('Failed to load channel configuration');

    const catalogItem = catalogRes.data.channels.find((item) => item.key === channelKey);
    if (!catalogItem) notFound();

    const linkedRepo = (linkedRes.data?.repositories ?? []).find((repo) => repo.id === repoId);
    if (!linkedRepo) notFound();

    const channel = channelsRes.data.channels.find((item) => item.channelKey === channelKey);
    if (!channel) notFound();

    if (!channel.availableOnPlan) redirect(`/dashboard/channels?repo=${repoId}`);

    const session = await AuthActions.getSession();
    if (!session) return null;

    return (
        <Stack gap="lg">
            <PageHeader icon={Radio} eyebrow="Channels" title="Configure channel" description="Set tone and delivery options for this channel on the selected repository." />
            <ChannelConfigClient repositoryId={repoId} repositoryName={linkedRepo.fullName} channel={channel} accountEmail={session.user.email} />
        </Stack>
    );
}
