import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
    it('forRootAsync returns a global DynamicModule importing TypeOrm', () => {
        const dynamicModule = DatabaseModule.forRootAsync({
            useFactory: () => ({ url: 'postgres://localhost:5432/shipshout' }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(DatabaseModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
    });
});
