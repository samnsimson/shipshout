import { WebhookStatus } from '@shipshout/database';
import { GithubPermissionsRequiredError, GithubReposService } from '../../services/github-repos.service';

jest.mock('@shipshout/shared-util', () => ({
    encryptSecret: (v: string) => v,
    decryptSecret: (v: string) => v,
}));

jest.mock('@shipshout/integrations-github', () => ({
    createGithubAppJwt: jest.fn(() => 'jwt'),
    exchangeGithubCode: jest.fn(),
    fetchGithubRepos: jest.fn(),
    fetchInstallation: jest.fn(),
    fetchInstallationAccessToken: jest.fn(async () => 'install-token'),
    fetchInstallationReposWithToken: jest.fn(async () => [{ id: 1, full_name: 'o/r' }]),
    fetchInstallationRepos: jest.fn(),
    githubAppPermissionsUpgradeUrl: jest.fn((slug: string, state?: string) =>
        `https://github.com/apps/${slug}/installations/new/permissions${state ? `?state=${state}` : ''}`,
    ),
    installationCanListRepos: jest.fn((p: Record<string, string>) => p.metadata === 'read'),
    installationCanManageWebhooks: jest.fn((p: Record<string, string>) => p.administration === 'write'),
    registerGithubWebhook: jest.fn(),
}));

import {
    fetchInstallation,
    installationCanListRepos,
    installationCanManageWebhooks,
    registerGithubWebhook,
} from '@shipshout/integrations-github';

describe('GithubReposService', () => {
    beforeEach(() => {
        process.env.API_BASE_URL = 'http://api.test';
        process.env.GITHUB_CLIENT_ID = 'client-id';
        process.env.GITHUB_CALLBACK_URL = 'http://api.test/api/auth/github/callback';
        delete process.env.GITHUB_APP_SLUG;
        jest.clearAllMocks();
    });

    it('builds OAuth start URL when GitHub App is not configured', () => {
        const svc = new GithubReposService({} as any);
        const url = svc.startUrl('ws-1');
        expect(url).toContain('github.com/login/oauth/authorize');
        expect(url).toContain('client_id=client-id');
        expect(url).toContain(encodeURIComponent('http://api.test/api/auth/github/callback'));
        expect(url).toContain(encodeURIComponent('repo:ws-1'));
    });

    it('uses GitHub App install URL when App is configured', () => {
        process.env.GITHUB_APP_SLUG = 'shipshout';
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        const svc = new GithubReposService({} as any);
        const url = svc.startUrl('ws-1');
        expect(url).toContain('github.com/apps/shipshout/installations/new');
        expect(url).toContain('state=ws-1');
    });

    it('detects GitHub App configuration', () => {
        process.env.GITHUB_APP_SLUG = 'shipshout';
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        const svc = new GithubReposService({} as any);
        expect(svc.usesGithubApp()).toBe(true);
    });

    it('throws permissions upgrade error when installation lacks webhook access', async () => {
        process.env.GITHUB_APP_SLUG = 'shipshout';
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        (fetchInstallation as jest.Mock).mockResolvedValue({ id: 1, permissions: {} });
        const svc = new GithubReposService({ listActiveGithubExternalIds: jest.fn(async () => []) } as any);
        await expect(svc.prepareInstallationSelection('ws-1', '123')).rejects.toBeInstanceOf(GithubPermissionsRequiredError);
    });

    it('marks App-imported repos active without per-repo webhook registration', async () => {
        process.env.GITHUB_APP_SLUG = 'shipshout';
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        (fetchInstallation as jest.Mock).mockResolvedValue({ id: 1, permissions: { metadata: 'read', administration: 'write' } });
        (installationCanListRepos as jest.Mock).mockReturnValue(true);
        (installationCanManageWebhooks as jest.Mock).mockReturnValue(true);
        const repos = {
            listActiveGithubExternalIds: jest.fn(async () => []),
            createFromGithub: jest.fn(async () => ({ repository: { id: 'r1' }, webhookSecret: 'secret', created: true })),
            setWebhookStatus: jest.fn(),
            setGithubConnection: jest.fn(),
        };
        const svc = new GithubReposService(repos as any);
        await svc.importSelected('ws-1', { workspaceId: 'ws-1', installationId: '123', repos: [{ id: 1, full_name: 'o/r' }] }, [1]);
        expect(registerGithubWebhook).not.toHaveBeenCalled();
        expect(repos.createFromGithub).toHaveBeenCalledWith(
            'ws-1',
            { id: 1, full_name: 'o/r' },
            { webhookStatus: WebhookStatus.Active, githubInstallationId: '123' },
        );
    });

    it('registers OAuth webhook and marks active on success', async () => {
        (registerGithubWebhook as jest.Mock).mockResolvedValue(undefined);
        const repos = {
            listActiveGithubExternalIds: jest.fn(async () => []),
            createFromGithub: jest.fn(async () => ({ repository: { id: 'r1' }, webhookSecret: 'secret', created: true })),
            setWebhookStatus: jest.fn(),
        };
        const svc = new GithubReposService(repos as any);
        await svc.importSelected(
            'ws-1',
            { workspaceId: 'ws-1', accessToken: 'enc', repos: [{ id: 1, full_name: 'o/r' }] },
            [1],
        );
        expect(registerGithubWebhook).toHaveBeenCalled();
        expect(repos.setWebhookStatus).toHaveBeenCalledWith('r1', WebhookStatus.Active);
    });

    it('retries webhook registration for existing failed repos', async () => {
        (registerGithubWebhook as jest.Mock).mockResolvedValue(undefined);
        const repos = {
            listActiveGithubExternalIds: jest.fn(async () => []),
            createFromGithub: jest.fn(async () => ({
                repository: { id: 'r1', webhookStatus: WebhookStatus.Failed, webhookSecret: 'enc' },
                webhookSecret: null,
                created: false,
            })),
            decryptSecret: jest.fn(() => 'secret'),
            setWebhookStatus: jest.fn(),
        };
        const svc = new GithubReposService(repos as any);
        await svc.importSelected(
            'ws-1',
            { workspaceId: 'ws-1', accessToken: 'enc', repos: [{ id: 1, full_name: 'o/r' }] },
            [1],
        );
        expect(registerGithubWebhook).toHaveBeenCalled();
        expect(repos.setWebhookStatus).toHaveBeenCalledWith('r1', WebhookStatus.Active);
    });

    it('marks webhook failed when OAuth registration throws', async () => {
        (registerGithubWebhook as jest.Mock).mockRejectedValue(new Error('403'));
        const repos = {
            listActiveGithubExternalIds: jest.fn(async () => []),
            createFromGithub: jest.fn(async () => ({ repository: { id: 'r1' }, webhookSecret: 'secret', created: true })),
            setWebhookStatus: jest.fn(),
        };
        const svc = new GithubReposService(repos as any);
        await svc.importSelected(
            'ws-1',
            { workspaceId: 'ws-1', accessToken: 'enc', repos: [{ id: 1, full_name: 'o/r' }] },
            [1],
        );
        expect(repos.setWebhookStatus).toHaveBeenCalledWith('r1', WebhookStatus.Failed);
    });
});
