import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GithubOAuthService } from '../services/github-oauth.service';

function configService(overrides: Record<string, string> = {}): ConfigService {
    const values: Record<string, string> = {
        GITHUB_CLIENT_ID: 'gh_client',
        GITHUB_CLIENT_SECRET: 'gh_secret',
        BETTER_AUTH_BASE_URL: 'http://localhost:8000',
        CLIENT_APP_URL: 'http://localhost:3000',
        BETTER_AUTH_SECRET: 'state-secret',
        ...overrides,
    };
    return {
        get: (key: string) => values[key],
        getOrThrow: (key: string) => {
            const value = values[key];
            if (!value) throw new Error(`Missing config: ${key}`);
            return value;
        },
    } as ConfigService;
}

describe('GithubOAuthService', () => {
    it('builds an authorization URL with signed state', () => {
        const service = new GithubOAuthService(configService());
        const url = new URL(service.getAuthorizationUrl('user-123'));

        expect(url.hostname).toBe('github.com');
        expect(url.searchParams.get('client_id')).toBe('gh_client');
        expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:8000/repositories/github/callback');
        expect(url.searchParams.get('scope')).toBe('read:user repo read:org');

        const state = url.searchParams.get('state');
        expect(state).toBeTruthy();
        expect(service.verifyState(state!)).toEqual(expect.objectContaining({ userId: 'user-123' }));
    });

    it('rejects tampered OAuth state', () => {
        const service = new GithubOAuthService(configService());
        const url = new URL(service.getAuthorizationUrl('user-123'));
        const state = url.searchParams.get('state')!.replace(/.$/, 'x');
        expect(() => service.verifyState(state)).toThrow(BadRequestException);
    });
});
