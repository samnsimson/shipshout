import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseNamingStrategy } from './libs/database/src/lib/snake-naming.strategy';
import path from 'path';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for TypeORM CLI');

export default new DataSource({
    url,
    type: 'postgres',
    namingStrategy: databaseNamingStrategy,
    entities: [path.join(__dirname, 'libs/database/dist/lib/entities/**/*.entity.{ts,js}')],
    migrations: [path.join(__dirname, 'libs/database/src/lib/migrations/**/*.{ts,js}')],
    synchronize: false,
});
