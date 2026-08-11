import path from 'node:path';
import { DatabaseConnectionOptions } from './database-module.options';
import { ENTITIES } from './entities';
import { databaseNamingStrategy } from './snake-naming.strategy';

export function buildTypeOrmOptions(connection: DatabaseConnectionOptions) {
    return {
        ...connection,
        type: 'postgres' as const,
        entities: ENTITIES,
        migrations: [path.join(__dirname, 'migrations/**/*.{ts,js}')],
        namingStrategy: databaseNamingStrategy,
        synchronize: false,
    };
}
