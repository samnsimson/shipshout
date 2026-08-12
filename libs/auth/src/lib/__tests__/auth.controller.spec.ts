jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ api: {} })) }));
jest.mock('better-auth/plugins', () => ({
    username: jest.fn(() => ({})),
    oneTimeToken: jest.fn(() => ({})),
    jwt: jest.fn(() => ({})),
}));
jest.mock('@shipshout/email-client', () => ({ EmailClient: jest.fn() }));
jest.mock('@better-auth/stripe', () => ({ stripe: jest.fn(() => ({ id: 'stripe-plugin' })) }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

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
jest.mock('../utils/auth-jwt.utils', () => ({
    AuthJwtUtils: {
        applyAuthTokens: jest.fn(),
        clearAuthTokens: jest.fn(),
    },
}));

import { AUTH_OPTIONS } from '../constants/auth.constants';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';

describe('AuthController', () => {
    const authService = {
        register: jest.fn(),
        login: jest.fn(),
        getSession: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
        isUsernameAvailable: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
        verifyEmail: jest.fn(),
        resendVerification: jest.fn(),
        startSocial: jest.fn(),
    };
    const authOptions = { baseUrl: 'http://localhost:8000', clientAppUrl: 'http://localhost:3000', resendApiKey: 're_test', databaseUrl: 'postgres://x' };
    const controller = new AuthController(authService as unknown as AuthService, authOptions);
    const req = { headers: { host: 'localhost' } } as never;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('register applies JWT cookies and returns body', async () => {
        authService.register.mockResolvedValue({
            headers: new Headers(),
            tokens: { accessToken: 'jwt.access', refreshToken: 'sess_tok' },
            body: { user: { id: '1', email: 'a@b.com', name: 'Ada' }, accessToken: 'jwt.access' },
        });
        const res = { append: jest.fn() } as never;

        const body = await controller.register({ email: 'a@b.com', password: 'password1', name: 'Ada', username: 'ada' }, req, res);

        expect(authService.register).toHaveBeenCalled();
        expect(AuthJwtUtils.applyAuthTokens).toHaveBeenCalledWith(res, { accessToken: 'jwt.access', refreshToken: 'sess_tok' }, { baseUrl: authOptions.baseUrl, cookieDomain: undefined });
        expect(body).toEqual({ user: { id: '1', email: 'a@b.com', name: 'Ada' }, accessToken: 'jwt.access' });
    });

    it('logout clears JWT cookies and returns ok', async () => {
        authService.logout.mockResolvedValue({ headers: new Headers(), body: { ok: true } });
        const res = { append: jest.fn() } as never;

        await expect(controller.logout(req, res)).resolves.toEqual({ ok: true });
        expect(AuthJwtUtils.clearAuthTokens).toHaveBeenCalledWith(res, { baseUrl: authOptions.baseUrl, cookieDomain: undefined });
    });

    it('refresh applies JWT cookies and returns accessToken', async () => {
        authService.refresh.mockResolvedValue({
            body: { accessToken: 'jwt.new' },
            tokens: { accessToken: 'jwt.new', refreshToken: 'sess_tok' },
        });
        const res = { append: jest.fn() } as never;

        await expect(controller.refresh(req, res)).resolves.toEqual({ accessToken: 'jwt.new' });
        expect(AuthJwtUtils.applyAuthTokens).toHaveBeenCalled();
    });

    it('login redirects when email verification is required', async () => {
        authService.login.mockResolvedValue({ redirectUrl: 'http://localhost:3000/verify-email?email=a%40b.com' });
        const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };

        await expect(controller.login({ login: 'a@b.com', password: 'password1' }, req, res as never)).resolves.toBeUndefined();
        expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/verify-email?email=a%40b.com');
    });

    it('forgotPassword delegates to service', async () => {
        authService.forgotPassword.mockResolvedValue({ ok: true });
        await expect(controller.forgotPassword({ email: 'a@b.com' }, req)).resolves.toEqual({ ok: true });
    });

    it('google redirects using service result', async () => {
        authService.startSocial.mockResolvedValue({
            headers: new Headers(),
            url: 'https://accounts.google.com/o/oauth2',
        });
        const res = { redirect: jest.fn() };

        await controller.google(req, res as never);

        expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2');
    });
});
