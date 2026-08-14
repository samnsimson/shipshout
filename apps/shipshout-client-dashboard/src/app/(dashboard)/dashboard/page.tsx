import { Stack } from '@chakra-ui/react';
import { Home } from 'lucide-react';
import type { Metadata } from 'next';
import { DashboardHomeClient } from '@/components/dashboard/dashboard-home-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { getSession } from '@/lib/auth/auth.actions';
import { BillingApi } from '@/lib/billing/billing.api';
import { ChannelsApi } from '@/lib/channels/channels.api';
import { DashboardHomeUtils, type RepoHomeContext } from '@/lib/dashboard/dashboard-home.utils';
import { RepositoriesApi } from '@/lib/repositories/repositories.api';
import { ShoutoutsApi } from '@/lib/shoutouts/shoutouts.api';
import { TriggersApi } from '@/lib/triggers/triggers.api';

export const metadata: Metadata = {
    title: 'Dashboard',
};

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

async function loadRepoContexts(linkedRepos: { id: string; fullName: string }[]): Promise<RepoHomeContext[]> {
    if (linkedRepos.length === 0) return [];

    const results = await Promise.all(
        linkedRepos.map(async (repo) => {
            const [detailRes, channelsRes] = await Promise.all([
                TriggersApi.fetchRepositoryDetail(repo.id),
                ChannelsApi.fetchRepositoryChannels(repo.id),
            ]);

            if (!detailRes.data || !channelsRes.data) {
                return {
                    id: repo.id,
                    fullName: repo.fullName,
                    activeTriggerCount: 0,
                    webhookStatus: 'not_configured' as const,
                    channels: [],
                };
            }

            return {
                id: repo.id,
                fullName: repo.fullName,
                activeTriggerCount: detailRes.data.activeTriggerCount,
                webhookStatus: detailRes.data.webhook.status,
                channels: channelsRes.data.channels.map((channel) => ({
                    channelKey: channel.channelKey,
                    enabled: channel.enabled,
                })),
            };
        }),
    );

    return results;
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) return null;

    const publicApiBaseUrl = process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? process.env.SHIPSHOUT_API_URL;
    if (!publicApiBaseUrl) throw new Error('NEXT_PUBLIC_SHIPSHOUT_API_URL is not set');
    const connectUrl = `${normalizeBaseUrl(publicApiBaseUrl)}/repositories/github/connect`;

    const [connectionRes, linkedRes, subscriptionRes] = await Promise.all([
        RepositoriesApi.getGithubConnection(),
        RepositoriesApi.listLinkedRepos(),
        BillingApi.getMySubscription(),
    ]);

    const connection = connectionRes.data ?? { connected: false };
    const linkedRepos = linkedRes.data?.repositories ?? [];
    const planChannels = subscriptionRes.data?.limits.channels ?? [];

    const repoContexts = await loadRepoContexts(linkedRepos);

    const setup = DashboardHomeUtils.buildSetupState({
        connected: Boolean(connection.connected),
        linkedRepos,
        repoContexts,
        connectUrl,
        planChannels,
    });

    let stats;
    let actionItems;
    let recentShoutouts;

    if (setup.complete) {
        const shoutoutsRes = await ShoutoutsApi.fetchAll();
        const shoutouts = shoutoutsRes.data?.shoutouts ?? [];
        stats = DashboardHomeUtils.buildStats(linkedRepos.length, repoContexts, shoutouts.length, planChannels);
        actionItems = DashboardHomeUtils.buildActionItems(repoContexts, shoutouts);
        recentShoutouts = DashboardHomeUtils.buildRecentShoutouts(shoutouts);
    }

    const { user } = session;
    const handle = user.username ? `@${user.username}` : user.email;
    const description = setup.complete
        ? `You're signed in as ${handle}. Your repos are wired up and shouting.`
        : `You're signed in as ${handle}. Finish setup to start shouting.`;

    return (
        <Stack gap="lg">
            <PageHeader
                icon={Home}
                eyebrow="Dashboard"
                title={`Welcome back${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}
                description={description}
            />
            <DashboardHomeClient setup={setup} stats={stats} actionItems={actionItems} recentShoutouts={recentShoutouts} />
        </Stack>
    );
}
