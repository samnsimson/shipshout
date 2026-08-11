import { DatabaseModule } from '../database.module';
import { buildTypeOrmOptions } from '../build-typeorm-options';

describe('DatabaseModule', () => {
    it('forRootAsync returns a global DynamicModule importing TypeOrm', () => {
        const dynamicModule = DatabaseModule.forRootAsync({
            useFactory: () => ({ url: 'postgres://localhost:5432/shipshout' }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(DatabaseModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
    });

    it('buildTypeOrmOptions registers entity classes and migration globs and disables synchronize', () => {
        const options = buildTypeOrmOptions({ url: 'postgres://localhost:5432/shipshout' });

        expect(options.type).toBe('postgres');
        expect(options.synchronize).toBe(false);
        expect(options.namingStrategy).toBeDefined();
        expect(options.entities).toEqual(expect.arrayContaining([expect.any(Function)]));
        expect(String(options.migrations[0])).toContain('migrations/**/*.');
    });
});
