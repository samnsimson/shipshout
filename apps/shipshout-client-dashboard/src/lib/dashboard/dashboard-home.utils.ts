import { ChannelUtils } from '@/lib/channels/channels.utils';

export type SetupStep = 'github' | 'repo' | 'trigger' | 'channel';

export type SetupStepState = { done: boolean; href: string; cta: string };

export type SetupState = {
    complete: boolean;
    steps: Record<SetupStep, SetupStepState>;
};

export type DashboardStats = {
    linkedRepos: number;
    activeTriggers: number;
    channelsOn: number;
    shoutouts: number;
};

export type ActionItem = {
    message: string;
    href: string;
    tone?: 'default' | 'danger';
};

export type RepoHomeContext = {
    id: string;
    fullName: string;
    activeTriggerCount: number;
    webhookStatus: 'pending' | 'active' | 'manual_required' | 'error' | 'not_configured';
    channels: { channelKey: string; enabled: boolean }[];
};

export type ShoutoutHomeRow = {
    id: string;
    title: string;
    status: string;
    createdAt: string;
};

export class DashboardHomeUtils {
    static buildSetupState(input: {
        connected: boolean;
        linkedRepos: { id: string }[];
        repoContexts: RepoHomeContext[];
        connectUrl: string;
        planChannels: string[];
    }): SetupState {
        const firstLinkedId = input.linkedRepos[0]?.id;
        const hasTrigger = input.repoContexts.some((repo) => repo.activeTriggerCount >= 1);
        const hasGeneratableChannel = input.repoContexts.some(
            (repo) => ChannelUtils.filterGeneratable(repo.channels, input.planChannels).length >= 1,
        );

        const githubDone = input.connected;
        const repoDone = input.linkedRepos.length >= 1;
        const triggerDone = hasTrigger;
        const channelDone = hasGeneratableChannel;

        const repoDetailHref = firstLinkedId ? `/dashboard/repositories/${firstLinkedId}` : '/dashboard/repositories';
        const channelHref = firstLinkedId ? `/dashboard/channels?repo=${firstLinkedId}` : '/dashboard/channels';

        const steps: SetupState['steps'] = {
            github: {
                done: githubDone,
                href: githubDone ? '/dashboard/repositories' : input.connectUrl,
                cta: githubDone ? 'View repos' : 'Connect GitHub',
            },
            repo: { done: repoDone, href: '/dashboard/repositories', cta: 'Link a repo' },
            trigger: { done: triggerDone, href: repoDetailHref, cta: 'Configure triggers' },
            channel: { done: channelDone, href: channelHref, cta: 'Enable a channel' },
        };

        return { complete: githubDone && repoDone && triggerDone && channelDone, steps };
    }

    static buildStats(linkedRepos: number, repoContexts: RepoHomeContext[], shoutoutCount: number, planChannels: string[]): DashboardStats {
        return {
            linkedRepos,
            activeTriggers: repoContexts.reduce((sum, repo) => sum + repo.activeTriggerCount, 0),
            channelsOn: repoContexts.reduce((sum, repo) => sum + ChannelUtils.filterGeneratable(repo.channels, planChannels).length, 0),
            shoutouts: shoutoutCount,
        };
    }

    static buildActionItems(repoContexts: RepoHomeContext[], shoutouts: ShoutoutHomeRow[]): ActionItem[] {
        const items: ActionItem[] = [];

        for (const repo of repoContexts) {
            if (repo.webhookStatus !== 'error') continue;
            items.push({
                message: `Webhook error on ${repo.fullName}`,
                href: `/dashboard/repositories/${repo.id}`,
                tone: 'danger',
            });
        }

        for (const shoutout of shoutouts) {
            if (shoutout.status === 'generation_failed')
                items.push({ message: `Generation failed: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
        }

        for (const shoutout of shoutouts) {
            if (shoutout.status === 'failed' || shoutout.status === 'partially_published')
                items.push({ message: `Dispatch issue: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
        }

        for (const shoutout of shoutouts) {
            if (shoutout.status === 'ready_for_review')
                items.push({ message: `Draft ready to publish: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
        }

        return items.slice(0, 5);
    }

    static buildRecentShoutouts<T extends ShoutoutHomeRow>(shoutouts: T[]): T[] {
        return [...shoutouts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
    }
}
