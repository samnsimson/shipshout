describe('typeorm.config', () => {
    const previousUrl = process.env.DATABASE_URL;

    afterEach(() => {
        if (previousUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previousUrl;

        // Clear module cache so each test re-evaluates env
        jest.resetModules();
    });

    it('exports a postgres DataSource using path.join entity and migration globs', async () => {
        process.env.DATABASE_URL = 'postgres://localhost:5432/shipshout';

        const { default: dataSource } = await import('../../../../../typeorm.config');

        expect(dataSource.options.type).toBe('postgres');
        expect(dataSource.options.synchronize).toBe(false);

        const entities = dataSource.options.entities as string[];
        const migrations = dataSource.options.migrations as string[];
        expect(entities[0]).toContain('libs/database/dist/lib/entities/**/*.entity.');
        expect(migrations[0]).toContain('libs/database/src/lib/migrations/**/*.');
    });

    it('throws when DATABASE_URL is missing', async () => {
        delete process.env.DATABASE_URL;

        await expect(import('../../../../../typeorm.config')).rejects.toThrow(/DATABASE_URL/);
    });
});
