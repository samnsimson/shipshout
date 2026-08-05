import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from '../typeorm.config.js';
import { MIGRATIONS } from '../migration-classes.js';

export async function createTestDataSource(): Promise<DataSource> {
    const ds = new DataSource({
        ...buildTypeOrmOptions(process.env.TEST_DATABASE_URL ?? ''),
        migrations: MIGRATIONS,
    });
    await ds.initialize();
    await ds.runMigrations();
    return ds;
}

export async function truncateAll(ds: DataSource): Promise<void> {
    const tables = ds.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
    if (tables) await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
}
