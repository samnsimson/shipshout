import { Request } from 'express';
import { GithubRepoConnectService } from '../../services/github-repo-connect.service';
import { GithubReposService } from '../../services/github-repos.service';

describe('GithubRepoConnectService', () => {
    const pending = {
        workspaceId: 'ws-1',
        repos: [{ id: 1, full_name: 'o/r' }],
    };

    function makeReq(): Request {
        const session = { githubRepoConnect: undefined as unknown, save: jest.fn((cb: (err?: Error) => void) => cb()) };
        return { session } as unknown as Request;
    }

    it('completeOAuthConnect redirects to repo picker when repos are available', async () => {
        const githubRepos = {
            prepareOAuthSelection: jest.fn(async () => ({ pending, skipped: 0, total: 1 })),
        };
        const svc = new GithubRepoConnectService(githubRepos as unknown as GithubReposService);
        const url = await svc.completeOAuthConnect(makeReq(), 'ws-1', 'code');
        expect(url).toContain('/ws-1/settings/repositories/select');
    });

    it('completeOAuthConnect redirects to settings when code is missing', async () => {
        const svc = new GithubRepoConnectService({} as GithubReposService);
        const url = await svc.completeOAuthConnect(makeReq(), 'ws-1', undefined);
        expect(url).toContain('error=connect_failed');
    });

    it('completeInstallConnect auto-imports and redirects to settings when repos are available', async () => {
        const pending = { workspaceId: 'ws-1', installationId: '123', repos: [{ id: 1, full_name: 'o/r' }] };
        const githubRepos = {
            prepareInstallationSelection: jest.fn(async () => ({ pending, skipped: 0, total: 1 })),
            importSelected: jest.fn(async () => ({ imported: 1, skipped: 0, failed: 0, total: 1 })),
        };
        const svc = new GithubRepoConnectService(githubRepos as unknown as GithubReposService);
        const url = await svc.completeInstallConnect(makeReq(), 'ws-1', '123');
        expect(url).toContain('/ws-1/settings/repositories');
        expect(url).not.toContain('/select');
        expect(url).toContain('connected=1');
        expect(githubRepos.importSelected).toHaveBeenCalledWith('ws-1', pending, [1]);
    });

    it('completeInstallConnect redirects to settings when no new repos', async () => {
        const githubRepos = {
            prepareInstallationSelection: jest.fn(async () => ({
                pending: { workspaceId: 'ws-1', repos: [] },
                skipped: 1,
                total: 1,
            })),
        };
        const svc = new GithubRepoConnectService(githubRepos as unknown as GithubReposService);
        const url = await svc.completeInstallConnect(makeReq(), 'ws-1', '123');
        expect(url).toContain('connected=0');
    });
});
