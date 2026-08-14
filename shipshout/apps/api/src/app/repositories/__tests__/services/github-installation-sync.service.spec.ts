import { WebhookStatus } from '@shipshout/database';
import { GithubInstallationSyncService } from '../../services/github-installation-sync.service';

jest.mock('@shipshout/integrations-github', () => ({
    createGithubAppJwt: jest.fn(() => 'jwt'),
    fetchAppInstallations: jest.fn(async () => []),
    fetchInstallationAccessToken: jest.fn(async () => 'token'),
    fetchInstallationReposWithToken: jest.fn(async () => []),
}));

import { fetchAppInstallations, fetchInstallationAccessToken, fetchInstallationReposWithToken } from '@shipshout/integrations-github';

describe('GithubInstallationSyncService', () => {
    beforeEach(() => {
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        jest.clearAllMocks();
    });

    it('marks repos disconnected when installation is deleted', async () => {
        const repos = { update: jest.fn() };
        const svc = new GithubInstallationSyncService(repos as any);
        await svc.handleInstallation({ action: 'deleted', installation: { id: 99 } });
        expect(repos.update).toHaveBeenCalledWith(
            { provider: 'github', githubInstallationId: '99' },
            { webhookStatus: WebhookStatus.Disconnected },
        );
    });

    it('marks removed repos disconnected on installation_repositories', async () => {
        const repos = { update: jest.fn() };
        const svc = new GithubInstallationSyncService(repos as any);
        await svc.handleInstallationRepositories({
            action: 'removed',
            repositories_removed: [{ id: 42 }, { id: 43 }],
        });
        expect(repos.update).toHaveBeenCalledWith(
            expect.objectContaining({ externalId: expect.anything() }),
            { webhookStatus: WebhookStatus.Disconnected },
        );
    });

    it('marks legacy repos disconnected when app has no installations', async () => {
        (fetchAppInstallations as jest.Mock).mockResolvedValue([]);
        const repos = {
            find: jest.fn(async () => [
                { id: 'r1', externalId: '1', webhookStatus: WebhookStatus.Active, githubInstallationId: null },
            ]),
            update: jest.fn(),
        };
        const svc = new GithubInstallationSyncService(repos as any);
        await svc.reconcileWorkspace('ws-1');
        expect(repos.update).toHaveBeenCalledWith('r1', { webhookStatus: WebhookStatus.Disconnected });
    });

    it('backfills installationId for legacy repos still installed', async () => {
        (fetchAppInstallations as jest.Mock).mockResolvedValue([{ id: 99 }]);
        (fetchInstallationReposWithToken as jest.Mock).mockResolvedValue([{ id: 1, full_name: 'o/r' }]);
        const repos = {
            find: jest.fn(async () => [
                { id: 'r1', externalId: '1', webhookStatus: WebhookStatus.Active, githubInstallationId: null },
            ]),
            update: jest.fn(),
        };
        const svc = new GithubInstallationSyncService(repos as any);
        await svc.reconcileWorkspace('ws-1');
        expect(repos.update).toHaveBeenCalledWith('r1', { githubInstallationId: '99' });
    });

    it('marks repos disconnected when removed from all installations', async () => {
        (fetchAppInstallations as jest.Mock).mockResolvedValue([{ id: 99 }]);
        (fetchInstallationReposWithToken as jest.Mock).mockResolvedValue([]);
        const repos = {
            find: jest.fn(async () => [
                { id: 'r1', externalId: '1', webhookStatus: WebhookStatus.Active, githubInstallationId: '99' },
            ]),
            update: jest.fn(),
        };
        const svc = new GithubInstallationSyncService(repos as any);
        await svc.reconcileWorkspace('ws-1');
        expect(repos.update).toHaveBeenCalledWith('r1', { webhookStatus: WebhookStatus.Disconnected });
    });
});
