jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ api: {} })) }));
jest.mock('better-auth/plugins', () => ({ username: jest.fn(() => ({})) }));
jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth/api', () => ({
    APIError: class APIError extends Error {},
}));
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn(() => new Headers()),
}));
jest.mock('@thallesp/nestjs-better-auth', () => ({
    AllowAnonymous: () => () => undefined,
    AuthService: class BetterAuthService {},
}));

import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';

describe('AuthController', () => {
    const authService = {
        register: jest.fn(),
        login: jest.fn(),
        getSession: jest.fn(),
        logout: jest.fn(),
        isUsernameAvailable: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
        startSocial: jest.fn(),
    };
    const controller = new AuthController(authService as unknown as AuthService);
    const req = { headers: { host: 'localhost' } } as never;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('register applies cookies and returns body', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'session=abc; Path=/');
        authService.register.mockResolvedValue({
            headers,
            body: { user: { id: '1', email: 'a@b.com', name: 'Ada' }, session: { token: 'tok' } },
        });
        const appended: string[] = [];
        const res = { append: (_n: string, v: string) => appended.push(v) } as never;

        const body = await controller.register({ email: 'a@b.com', password: 'password1', name: 'Ada', username: 'ada' }, req, res);

        expect(authService.register).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1', name: 'Ada', username: 'ada' }, req.headers);
        expect(body).toEqual({ user: { id: '1', email: 'a@b.com', name: 'Ada' }, session: { token: 'tok' } });
        expect(appended).toEqual(['session=abc; Path=/']);
    });

    it('logout applies cookies and returns ok', async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'better-auth.session_token=; Max-Age=0');
        authService.logout.mockResolvedValue({ headers, body: { ok: true } });
        const appended: string[] = [];
        const res = { append: (_n: string, v: string) => appended.push(v) } as never;

        await expect(controller.logout(req, res)).resolves.toEqual({ ok: true });
        expect(authService.logout).toHaveBeenCalledWith(req.headers);
        expect(appended).toEqual(['better-auth.session_token=; Max-Age=0']);
    });

    it('forgotPassword delegates to service', async () => {
        authService.forgotPassword.mockResolvedValue({ ok: true });
        await expect(controller.forgotPassword({ email: 'a@b.com' }, req)).resolves.toEqual({ ok: true });
        expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'a@b.com' }, req.headers);
    });

    it('google redirects using service result', async () => {
        authService.startSocial.mockResolvedValue({
            headers: new Headers(),
            url: 'https://accounts.google.com/o/oauth2',
        });
        const res = { append: jest.fn(), redirect: jest.fn() };

        await controller.google(req, res as never);

        expect(authService.startSocial).toHaveBeenCalledWith('google', req.headers);
        expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2');
    });
});
