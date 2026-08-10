jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ api: {} })) }));
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
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
        signInSocial: jest.fn(),
    };
    const betterAuth = { api } as never;
    const service = new AuthService(betterAuth);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('register returns user/session and headers', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'session=abc; Path=/');
        api.signUpEmail.mockResolvedValue({
            headers,
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada' }, token: 'tok' },
        });

        const result = await service.register({ email: 'a@b.com', password: 'password1', name: 'Ada' }, {});

        expect(result.body).toEqual({ user: { id: '1', email: 'a@b.com', name: 'Ada' }, session: { token: 'tok' } });
        expect(result.headers).toBe(headers);
    });

    it('forgotPassword always returns ok', async () => {
        api.requestPasswordReset.mockResolvedValue({ status: true });
        await expect(service.forgotPassword({ email: 'a@b.com' }, {})).resolves.toEqual({ ok: true });
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
