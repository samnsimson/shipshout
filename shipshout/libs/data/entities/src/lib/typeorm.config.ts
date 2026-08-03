import { DataSourceOptions } from 'typeorm';

export const ENTITIES: Function[] = [];

export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    entities: ENTITIES,
    migrations: [__dirname + '/migrations/*.js'],
  };
}
