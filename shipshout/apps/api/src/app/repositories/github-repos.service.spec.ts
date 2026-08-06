import { GithubReposService } from './github-repos.service';

describe('GithubReposService', () => {
    beforeEach(() => {
        process.env.API_BASE_URL = 'http://api.test';
        process.env.GITHUB_CLIENT_ID = 'client-id';
        process.env.GITHUB_CALLBACK_URL = 'http://api.test/api/auth/github/callback';
        delete process.env.GITHUB_APP_SLUG;
    });

    it('builds OAuth start URL when GitHub App is not configured', () => {
        const svc = new GithubReposService({} as any);
        const url = svc.startUrl('ws-1');
        expect(url).toContain('github.com/login/oauth/authorize');
        expect(url).toContain('client_id=client-id');
        expect(url).toContain(encodeURIComponent('http://api.test/api/auth/github/callback'));
        expect(url).toContain(encodeURIComponent('repo:ws-1'));
    });

    it('uses OAuth start URL even when GitHub App is configured', () => {
        process.env.GITHUB_APP_SLUG = 'shipshout';
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        const svc = new GithubReposService({} as any);
        const url = svc.startUrl('ws-1');
        expect(url).toContain('github.com/login/oauth/authorize');
        expect(url).toContain(encodeURIComponent('repo:ws-1'));
    });

    it('detects GitHub App configuration', () => {
        process.env.GITHUB_APP_SLUG = 'shipshout';
        process.env.GITHUB_APP_ID = '1';
        process.env.GITHUB_APP_PRIVATE_KEY = 'key';
        const svc = new GithubReposService({} as any);
        expect(svc.usesGithubApp()).toBe(true);
    });
});
