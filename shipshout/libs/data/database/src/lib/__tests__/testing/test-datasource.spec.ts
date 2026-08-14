import { createTestDataSource, truncateAll } from '../../testing/test-datasource.js';

const hasTestDb = !!process.env.TEST_DATABASE_URL;

(hasTestDb ? describe : describe.skip)('test datasource', () => {
    it('connects, migrates, and truncates', async () => {
        const ds = await createTestDataSource();
        expect(ds.isInitialized).toBe(true);
        await truncateAll(ds);
        await ds.destroy();
    });
});
