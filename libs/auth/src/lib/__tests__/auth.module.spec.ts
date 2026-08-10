jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({})) }));
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
import { AuthController } from '../controllers/auth.controller';
import { EMAIL_ADAPTER } from '../email/email-adapter';
import { LoggingEmailAdapter } from '../email/logging-email.adapter';

describe('AuthModule', () => {
    it('forRootAsync returns a global DynamicModule with email adapter', () => {
        const dynamicModule = AuthModule.forRootAsync({
            useFactory: () => ({ databaseUrl: 'postgres://localhost:5432/shipshout' }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(AuthModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
        expect(dynamicModule.controllers).toEqual([AuthController]);
        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: EMAIL_ADAPTER,
                    useValue: expect.any(LoggingEmailAdapter),
                }),
            ]),
        );
    });
});
