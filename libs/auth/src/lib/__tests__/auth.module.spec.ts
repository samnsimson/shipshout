import { AuthModule } from '../auth.module';
import { AUTH_MODULE_OPTIONS } from '../constants/auth-module-options';

describe('AuthModule', () => {
    it('forRootAsync returns a global DynamicModule with options provider', () => {
        const dynamicModule = AuthModule.forRootAsync({
            useFactory: () => ({}),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(AuthModule);
        expect(dynamicModule.exports).toContain(AUTH_MODULE_OPTIONS);
        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: AUTH_MODULE_OPTIONS,
                }),
            ]),
        );
    });
});
