import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from '../typeorm.config.js';
import { Init1785733057155 } from '../migrations/1785733057155-Init.js';
import { Ingestion1785734410746 } from '../migrations/1785734410746-Ingestion.js';
import { Drafts1785734598224 } from '../migrations/1785734598224-Drafts.js';
import { Dispatch1785734986934 } from '../migrations/1785734986934-Dispatch.js';
import { Billing1785735200000 } from '../migrations/1785735200000-Billing.js';

const TEST_MIGRATIONS = [
    Init1785733057155,
    Ingestion1785734410746,
    Drafts1785734598224,
    Dispatch1785734986934,
    Billing1785735200000,
];

export async function createTestDataSource(): Promise<DataSource> {
    const ds = new DataSource({
        ...buildTypeOrmOptions(process.env.TEST_DATABASE_URL ?? ''),
        migrations: TEST_MIGRATIONS,
    });
    await ds.initialize();
    await ds.runMigrations();
    return ds;
}

export async function truncateAll(ds: DataSource): Promise<void> {
    const tables = ds.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
    if (tables) await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
}
