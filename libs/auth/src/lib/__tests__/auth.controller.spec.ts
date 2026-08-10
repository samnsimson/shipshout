jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ api: {} })) }));
jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth/api', () => ({
    APIError: class APIError extends Error {},
}));
jest.mock('@thallesp/nestjs-better-auth', () => ({
    AuthModule: {
        forRootAsync: jest.fn((options: unknown) => ({
            module: class MockBetterAuthModule {},
            providers: [],
            exports: [],
            global: true,
            options,
        })),
    },
    AllowAnonymous: () => () => undefined,
    AuthService: class AuthService {},
}));
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn(() => new Headers()),
}));

import { AuthController } from '../controllers/auth.controller';

describe('AuthController', () => {
    const api = {
        signUpEmail: jest.fn(),
        signInEmail: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
        signInSocial: jest.fn(),
    };
    const authService = { api } as never;
    const controller = new AuthController(authService);
    const req = { headers: {} } as never;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('register returns user/session and applies cookies', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'session=abc; Path=/');
        api.signUpEmail.mockResolvedValue({
            headers,
            response: { user: { id: '1', email: 'a@b.com', name: 'Ada' }, token: 'tok' },
        });
        const appended: string[] = [];
        const res = { append: (_n: string, v: string) => appended.push(v) } as never;

        const body = await controller.register({ email: 'a@b.com', password: 'password1', name: 'Ada' }, req, res);

        expect(body).toEqual({ user: { id: '1', email: 'a@b.com', name: 'Ada' }, session: { token: 'tok' } });
        expect(appended).toEqual(['session=abc; Path=/']);
    });

    it('forgotPassword always returns ok', async () => {
        api.requestPasswordReset.mockResolvedValue({ status: true });
        await expect(controller.forgotPassword({ email: 'a@b.com' }, req)).resolves.toEqual({ ok: true });
    });

    it('google starts social auth and redirects', async () => {
        api.signInSocial.mockResolvedValue({
            headers: new Headers(),
            response: { url: 'https://accounts.google.com/o/oauth2' },
        });
        const res = { append: jest.fn(), redirect: jest.fn() };

        await controller.google(req, res as never);

        expect(api.signInSocial).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({ provider: 'google', disableRedirect: true }),
            }),
        );
        expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2');
    });
});
