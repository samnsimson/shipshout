jest.mock('jose', () => ({
    createRemoteJWKSet: jest.fn(),
    jwtVerify: jest.fn(),
}));
jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({})) }));
jest.mock('better-auth/plugins', () => ({
    username: jest.fn(() => ({})),
    oneTimeToken: jest.fn(() => ({})),
    jwt: jest.fn(() => ({})),
}));
jest.mock('@shipshout/email-client', () => ({ EmailClient: jest.fn() }));
jest.mock('@better-auth/stripe', () => ({ stripe: jest.fn(() => ({ id: 'stripe-plugin' })) }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn(() => new Headers()),
}));
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

import { AuthModule } from '../auth.module';
import { AUTH_OPTIONS } from '../constants/auth.constants';
import { AuthController } from '../controllers/auth.controller';
import { AuthSubscriptionController } from '../controllers/auth-subscription.controller';

describe('AuthModule', () => {
    it('forRootAsync returns a global DynamicModule', () => {
        const dynamicModule = AuthModule.forRootAsync({
            useFactory: () => ({
                databaseUrl: 'postgres://localhost:5432/shipshout',
                clientAppUrl: 'http://localhost:3000',
                resendApiKey: 're_test',
            }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(AuthModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
        expect(dynamicModule.controllers).toEqual([AuthController, AuthSubscriptionController]);
        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: AUTH_OPTIONS,
                }),
            ]),
        );
        expect(dynamicModule.exports).toEqual(expect.arrayContaining([AUTH_OPTIONS]));
    });
});
