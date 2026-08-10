jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({})) }));
jest.mock('pg', () => ({ Pool: jest.fn() }));
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
}));

import { AuthModule } from '../auth.module';

describe('AuthModule', () => {
    it('forRootAsync returns a global DynamicModule importing Better Auth', () => {
        const dynamicModule = AuthModule.forRootAsync({
            useFactory: () => ({ databaseUrl: 'postgres://localhost:5432/shipshout' }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(AuthModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
    });
});
