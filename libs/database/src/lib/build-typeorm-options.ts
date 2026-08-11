import { DatabaseConnectionOptions } from './database-module.options';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';
import { databaseNamingStrategy } from './snake-naming.strategy';

export function buildTypeOrmOptions(connection: DatabaseConnectionOptions) {
    return {
        ...connection,
        type: 'postgres' as const,
        entities: ENTITIES,
        migrations: MIGRATIONS,
        namingStrategy: databaseNamingStrategy,
        synchronize: false,
    };
}
