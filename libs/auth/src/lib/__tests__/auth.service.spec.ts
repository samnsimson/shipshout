jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ api: {} })) }));
jest.mock('better-auth/plugins', () => ({
    username: jest.fn(() => ({})),
    oneTimeToken: jest.fn(() => ({})),
    jwt: jest.fn(() => ({})),
}));
jest.mock('@better-auth/stripe', () => ({ stripe: jest.fn(() => ({ id: 'stripe-plugin' })) }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth/api', () => ({
    APIError: class APIError extends Error {},
}));
jest.mock('@thallesp/nestjs-better-auth', () => ({
    AuthService: class BetterAuthService {},
}));
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn((headers: Record<string, string>) => new Headers(headers)),
}));
jest.mock('../utils/auth-jwt.utils', () => ({
    AuthJwtUtils: {
        parseSessionTokenFromHeaders: jest.fn(),
        extractAccessToken: jest.fn(),
        extractRefreshToken: jest.fn(),
        refreshCookieHeader: jest.fn((token: string) => `auth_refresh=${token}`),
        verifyAccessToken: jest.fn(),
    },
}));

import { UnauthorizedException } from '@nestjs/common';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';
import { AuthService } from '../services/auth.service';

describe('AuthService', () => {
    const api = {
        signUpEmail: jest.fn(),
        signInEmail: jest.fn(),
        signInUsername: jest.fn(),
        getSession: jest.fn(),
        getToken: jest.fn(),
        signOut: jest.fn(),
        isUsernameAvailable: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
        signInSocial: jest.fn(),
        verifyEmail: jest.fn(),
        sendVerificationEmail: jest.fn(),
        generateOneTimeToken: jest.fn(),
        verifyOneTimeToken: jest.fn(),
    };
    const betterAuth = { api } as never;
    const authOptions = {
        databaseUrl: 'postgres://localhost/db',
        clientAppUrl: 'http://localhost:3000',
        baseUrl: 'http://localhost:8000',
        resendApiKey: 're_test',
    };
    const service = new AuthService(betterAuth, authOptions);

    beforeEach(() => {
        jest.clearAllMocks();
        (AuthJwtUtils.parseSessionTokenFromHeaders as jest.Mock).mockReturnValue('sess_tok');
        api.getToken.mockResolvedValue({ token: 'jwt.access' });
    });

    it('register returns user and accessToken', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'better-auth.session_token=sess_tok; Path=/');
        api.signUpEmail.mockResolvedValue({
            headers,
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' } },
        });

        const result = await service.register({ email: 'a@b.com', password: 'password1', name: 'Ada', username: 'ada' }, {});

        expect(result.body).toEqual({
            user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' },
            accessToken: 'jwt.access',
        });
        expect(result.tokens).toEqual({ accessToken: 'jwt.access', refreshToken: 'sess_tok' });
    });

    it('login with username uses signInUsername', async () => {
        api.signInUsername.mockResolvedValue({
            headers: new Headers(),
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' } },
        });

        await service.login({ login: 'ada', password: 'password1' }, {});

        expect(api.signInUsername).toHaveBeenCalledWith(expect.objectContaining({ body: { username: 'ada', password: 'password1' } }));
        expect(api.signInEmail).not.toHaveBeenCalled();
    });

    it('login with email uses signInEmail', async () => {
        api.signInEmail.mockResolvedValue({
            headers: new Headers(),
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' } },
        });

        await service.login({ login: 'a@b.com', password: 'password1' }, {});

        expect(api.signInEmail).toHaveBeenCalledWith(expect.objectContaining({ body: { email: 'a@b.com', password: 'password1' } }));
        expect(api.signInUsername).not.toHaveBeenCalled();
    });

    it('login returns verify-email redirect when email is not verified', async () => {
        const error = Object.assign(new Error('Email not verified'), {
            statusCode: 403,
            body: { code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' },
        });
        api.signInEmail.mockRejectedValue(error);

        await expect(service.login({ login: 'a@b.com', password: 'password1' }, {})).resolves.toEqual({
            redirectUrl: 'http://localhost:3000/verify-email?email=a%40b.com',
        });
    });

    it('getSession returns null when unauthenticated', async () => {
        (AuthJwtUtils.extractAccessToken as jest.Mock).mockReturnValue(null);
        await expect(service.getSession({})).resolves.toBeNull();
    });

    it('getSession maps user from verified JWT', async () => {
        (AuthJwtUtils.extractAccessToken as jest.Mock).mockReturnValue('jwt.access');
        (AuthJwtUtils.verifyAccessToken as jest.Mock).mockResolvedValue({ sub: '1', email: 'a@b.com', name: 'Ada', username: 'ada' });
        await expect(service.getSession({})).resolves.toEqual({
            user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' },
            accessToken: 'jwt.access',
        });
    });

    it('refresh returns new accessToken', async () => {
        (AuthJwtUtils.extractRefreshToken as jest.Mock).mockReturnValue('sess_tok');
        api.getToken.mockResolvedValue({ token: 'jwt.new' });

        await expect(service.refresh({})).resolves.toEqual({
            body: { accessToken: 'jwt.new' },
            tokens: { accessToken: 'jwt.new', refreshToken: 'sess_tok' },
        });
    });

    it('refresh throws when refresh cookie missing', async () => {
        (AuthJwtUtils.extractRefreshToken as jest.Mock).mockReturnValue(null);
        await expect(service.refresh({})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('logout returns ok and headers', async () => {
        const headers = new Headers();
        (AuthJwtUtils.extractRefreshToken as jest.Mock).mockReturnValue('sess_tok');
        api.signOut.mockResolvedValue({ headers, response: { success: true } });
        await expect(service.logout({})).resolves.toEqual({ headers, body: { ok: true } });
    });

    it('forgotPassword always returns ok', async () => {
        api.requestPasswordReset.mockResolvedValue({ status: true });
        await expect(service.forgotPassword({ email: 'a@b.com' }, {})).resolves.toEqual({ ok: true });
    });

    it('verifyEmail calls BA with query token and returns ok', async () => {
        api.verifyEmail.mockResolvedValue({ status: true, user: { id: '1' } });
        await expect(service.verifyEmail({ token: 'tok' }, {})).resolves.toEqual({ ok: true });
        expect(api.verifyEmail).toHaveBeenCalledWith(expect.objectContaining({ query: { token: 'tok' } }));
    });

    it('resendVerification returns ok even when BA throws', async () => {
        api.sendVerificationEmail.mockRejectedValue(new Error('nope'));
        await expect(service.resendVerification({ email: 'a@b.com' }, {})).resolves.toEqual({ ok: true });
    });

    it('startSocial returns redirect url', async () => {
        api.signInSocial.mockResolvedValue({
            headers: new Headers(),
            response: { url: 'https://accounts.google.com/o/oauth2' },
        });

        const result = await service.startSocial('google', {});

        expect(result.url).toBe('https://accounts.google.com/o/oauth2');
    });

    it('oauthBridge redirects to client callback with one-time token', async () => {
        api.getSession.mockResolvedValue({
            user: { id: '1', email: 'a@b.com', name: 'Ada' },
            session: { id: 's1', token: 'sess' },
        });
        api.generateOneTimeToken.mockResolvedValue({ token: 'ott-123' });

        await expect(service.oauthBridge({})).resolves.toEqual({
            redirectUrl: 'http://localhost:3000/auth/callback?token=ott-123',
        });
    });

    it('verifyOneTimeToken returns accessToken and tokens', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'better-auth.session_token=sess_tok; Path=/');
        api.verifyOneTimeToken.mockResolvedValue({
            headers,
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada' } },
        });

        const result = await service.verifyOneTimeToken({ token: 'ott-123' }, {});

        expect(result.body).toEqual({ user: { id: '1', email: 'a@b.com', name: 'Ada' }, accessToken: 'jwt.access' });
        expect(result.tokens.refreshToken).toBe('sess_tok');
    });
});
