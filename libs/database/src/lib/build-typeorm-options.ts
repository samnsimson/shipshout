import path from 'node:path';
import { DatabaseConnectionOptions } from './database-module.options';
import { databaseNamingStrategy } from './snake-naming.strategy';

export function buildTypeOrmOptions(connection: DatabaseConnectionOptions) {
    return {
        ...connection,
        type: 'postgres' as const,
        entities: [path.join(__dirname, 'entities/**/*.entity.{ts,js}')],
        migrations: [path.join(__dirname, 'migrations/**/*.{ts,js}')],
        namingStrategy: databaseNamingStrategy,
        synchronize: false,
    };
}
