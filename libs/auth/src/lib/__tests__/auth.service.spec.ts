jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ api: {} })) }));
jest.mock('better-auth/plugins', () => ({ username: jest.fn(() => ({})) }));
jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth/api', () => ({
    APIError: class APIError extends Error {},
}));
jest.mock('@thallesp/nestjs-better-auth', () => ({
    AuthService: class BetterAuthService {},
}));
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn(() => new Headers()),
}));

import { AuthService } from '../services/auth.service';

describe('AuthService', () => {
    const api = {
        signUpEmail: jest.fn(),
        signInEmail: jest.fn(),
        signInUsername: jest.fn(),
        getSession: jest.fn(),
        signOut: jest.fn(),
        isUsernameAvailable: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
        signInSocial: jest.fn(),
        verifyEmail: jest.fn(),
        sendVerificationEmail: jest.fn(),
    };
    const betterAuth = { api } as never;
    const authOptions = { databaseUrl: 'postgres://localhost/db', clientAppUrl: 'http://localhost:3000' };
    const service = new AuthService(betterAuth, authOptions);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('register returns user/session and headers', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'session=abc; Path=/');
        api.signUpEmail.mockResolvedValue({
            headers,
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' }, token: 'tok' },
        });

        const result = await service.register({ email: 'a@b.com', password: 'password1', name: 'Ada', username: 'ada' }, {});

        expect(api.signUpEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({ username: 'ada', email: 'a@b.com' }),
            }),
        );
        expect(result.body).toEqual({
            user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' },
            session: { token: 'tok' },
        });
        expect(result.headers).toBe(headers);
    });

    it('login with username uses signInUsername', async () => {
        api.signInUsername.mockResolvedValue({
            headers: new Headers(),
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' }, token: 'tok' },
        });

        await service.login({ login: 'ada', password: 'password1' }, {});

        expect(api.signInUsername).toHaveBeenCalledWith(
            expect.objectContaining({ body: { username: 'ada', password: 'password1' } }),
        );
        expect(api.signInEmail).not.toHaveBeenCalled();
    });

    it('login with email uses signInEmail', async () => {
        api.signInEmail.mockResolvedValue({
            headers: new Headers(),
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada', username: 'ada' }, token: 'tok' },
        });

        await service.login({ login: 'a@b.com', password: 'password1' }, {});

        expect(api.signInEmail).toHaveBeenCalledWith(
            expect.objectContaining({ body: { email: 'a@b.com', password: 'password1' } }),
        );
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
        api.getSession.mockResolvedValue(null);
        await expect(service.getSession({})).resolves.toBeNull();
    });

    it('getSession maps user and session', async () => {
        api.getSession.mockResolvedValue({
            user: { id: '1', email: 'a@b.com', name: 'Ada' },
            session: { id: 's1', token: 'tok' },
        });
        await expect(service.getSession({})).resolves.toEqual({
            user: { id: '1', email: 'a@b.com', name: 'Ada' },
            session: { id: 's1', token: 'tok' },
        });
    });

    it('logout returns ok and headers', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'better-auth.session_token=; Max-Age=0');
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

    it('resendVerification calls BA with plain email payload', async () => {
        api.sendVerificationEmail.mockResolvedValue({ status: true });
        await service.resendVerification({ email: 'a@b.com' }, {});
        expect(api.sendVerificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({ email: 'a@b.com' }),
            }),
        );
    });

    it('startSocial returns redirect url', async () => {
        api.signInSocial.mockResolvedValue({
            headers: new Headers(),
            response: { url: 'https://accounts.google.com/o/oauth2' },
        });

        const result = await service.startSocial('google', {});

        expect(api.signInSocial).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({ provider: 'google', disableRedirect: true }),
            }),
        );
        expect(result.url).toBe('https://accounts.google.com/o/oauth2');
    });
});
