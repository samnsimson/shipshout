import { DatabaseConnectionOptions } from './database-module.options';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

export function buildTypeOrmOptions(connection: DatabaseConnectionOptions) {
    return {
        ...connection,
        type: 'postgres' as const,
        entities: ENTITIES,
        migrations: MIGRATIONS,
        synchronize: false,
    };
}
