import { DataSource } from 'typeorm';
import { ENTITIES } from './libs/database/src/lib/entities';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for TypeORM CLI');

export default new DataSource({
    type: 'postgres',
    url,
    entities: ENTITIES,
    // Timestamp-prefixed files only — excludes migrations/index.ts registry
    migrations: ['libs/database/src/lib/migrations/[0-9]*.{ts,js}'],
    synchronize: false,
});
