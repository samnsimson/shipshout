import { DashboardHomeUtils } from '../dashboard-home.utils';

const connectUrl = 'https://api.example.com/repositories/github/connect';

describe('DashboardHomeUtils.buildSetupState', () => {
    it('marks complete when all four gates pass', () => {
        const setup = DashboardHomeUtils.buildSetupState({
            connected: true,
            linkedRepos: [{ id: 'repo-1' }],
            repoContexts: [
                {
                    id: 'repo-1',
                    fullName: 'acme/app',
                    activeTriggerCount: 1,
                    webhookStatus: 'active',
                    channels: [{ channelKey: 'x', enabled: true }],
                },
            ],
            connectUrl,
            planChannels: ['x'],
        });
        expect(setup.complete).toBe(true);
        expect(setup.steps.github.done).toBe(true);
        expect(setup.steps.repo.done).toBe(true);
        expect(setup.steps.trigger.done).toBe(true);
        expect(setup.steps.channel.done).toBe(true);
    });

    it('stays incomplete when generatable channel missing', () => {
        const setup = DashboardHomeUtils.buildSetupState({
            connected: true,
            linkedRepos: [{ id: 'repo-1' }],
            repoContexts: [
                {
                    id: 'repo-1',
                    fullName: 'acme/app',
                    activeTriggerCount: 1,
                    webhookStatus: 'active',
                    channels: [{ channelKey: 'email_alert', enabled: true }],
                },
            ],
            connectUrl,
            planChannels: ['email_alert', 'x'],
        });
        expect(setup.complete).toBe(false);
        expect(setup.steps.channel.done).toBe(false);
        expect(setup.steps.channel.href).toBe('/dashboard/channels?repo=repo-1');
    });

    it('uses connectUrl for github step when not connected', () => {
        const setup = DashboardHomeUtils.buildSetupState({
            connected: false,
            linkedRepos: [],
            repoContexts: [],
            connectUrl,
            planChannels: ['x'],
        });
        expect(setup.steps.github.href).toBe(connectUrl);
        expect(setup.steps.github.cta).toBe('Connect GitHub');
    });
});

describe('DashboardHomeUtils.buildActionItems', () => {
    it('prioritizes webhook errors over drafts and caps at five', () => {
        const items = DashboardHomeUtils.buildActionItems(
            [
                { id: 'r1', fullName: 'a/b', activeTriggerCount: 1, webhookStatus: 'error', channels: [] },
                { id: 'r2', fullName: 'c/d', activeTriggerCount: 1, webhookStatus: 'active', channels: [] },
            ],
            [
                { id: 's1', title: 'Draft', status: 'ready_for_review', createdAt: '2026-08-14T10:00:00.000Z' },
                { id: 's2', title: 'Fail', status: 'generation_failed', createdAt: '2026-08-14T09:00:00.000Z' },
                { id: 's3', title: 'Old', status: 'ready_for_review', createdAt: '2026-08-13T09:00:00.000Z' },
                { id: 's4', title: 'Old2', status: 'ready_for_review', createdAt: '2026-08-12T09:00:00.000Z' },
                { id: 's5', title: 'Old3', status: 'ready_for_review', createdAt: '2026-08-11T09:00:00.000Z' },
                { id: 's6', title: 'Old4', status: 'ready_for_review', createdAt: '2026-08-10T09:00:00.000Z' },
            ],
        );
        expect(items).toHaveLength(5);
        expect(items[0].tone).toBe('danger');
        expect(items[0].message).toContain('Webhook error');
        expect(items[1].message).toContain('Generation failed');
    });
});

describe('DashboardHomeUtils.buildRecentShoutouts', () => {
    it('sorts by createdAt desc and slices to five', () => {
        const rows = [
            { id: 'a', title: 'A', status: 'published', createdAt: '2026-08-10T00:00:00.000Z' },
            { id: 'b', title: 'B', status: 'published', createdAt: '2026-08-14T00:00:00.000Z' },
            { id: 'c', title: 'C', status: 'published', createdAt: '2026-08-12T00:00:00.000Z' },
            { id: 'd', title: 'D', status: 'published', createdAt: '2026-08-11T00:00:00.000Z' },
            { id: 'e', title: 'E', status: 'published', createdAt: '2026-08-13T00:00:00.000Z' },
            { id: 'f', title: 'F', status: 'published', createdAt: '2026-08-09T00:00:00.000Z' },
        ];
        const recent = DashboardHomeUtils.buildRecentShoutouts(rows);
        expect(recent.map((row) => row.id)).toEqual(['b', 'e', 'c', 'd', 'a']);
    });
});
