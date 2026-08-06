import { WebhookStatus } from '@shipshout/database';
import { GithubReposService } from '../../services/github-repos.service';

jest.mock('@shipshout/shared-util', () => ({
    encryptSecret: (v: string) => v,
    decryptSecret: (v: string) => v,
}));

jest.mock('@shipshout/integrations-github', () => ({
    createGithubAppJwt: jest.fn(() => 'jwt'),
    exchangeGithubCode: jest.fn(),
    fetchGithubRepos: jest.fn(),
    fetchInstallationAccessToken: jest.fn(async () => 'install-token'),
    fetchInstallationRepos: jest.fn(),
    registerGithubWebhook: jest.fn(),
}));

import { registerGithubWebhook } from '@shipshout/integrations-github';

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

    it('marks webhook active on App import without registering per-repo hooks', async () => {
        const repos = {
            listGithubExternalIds: jest.fn(async () => []),
            createFromGithub: jest.fn(async () => ({ repository: { id: 'r1' }, webhookSecret: 'secret', created: true })),
            setWebhookStatus: jest.fn(),
        };
        const svc = new GithubReposService(repos as any);
        await svc.importSelected('ws-1', { workspaceId: 'ws-1', installationId: '123', repos: [{ id: 1, full_name: 'o/r' }] }, [1]);
        expect(repos.createFromGithub).toHaveBeenCalledWith('ws-1', { id: 1, full_name: 'o/r' }, { webhookStatus: WebhookStatus.Active });
        expect(registerGithubWebhook).not.toHaveBeenCalled();
    });

    it('registers OAuth webhook and marks active on success', async () => {
        (registerGithubWebhook as jest.Mock).mockResolvedValue(undefined);
        const repos = {
            listGithubExternalIds: jest.fn(async () => []),
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

    it('marks webhook failed when OAuth registration throws', async () => {
        (registerGithubWebhook as jest.Mock).mockRejectedValue(new Error('403'));
        const repos = {
            listGithubExternalIds: jest.fn(async () => []),
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
