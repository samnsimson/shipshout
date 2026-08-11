import 'reflect-metadata';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { databaseNamingStrategy } from './libs/database/src/lib/snake-naming.strategy';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for TypeORM CLI');

export default new DataSource({
    type: 'postgres',
    url,
    namingStrategy: databaseNamingStrategy,
    // Compiled .entity.js — Bun cannot emit TypeORM decorator metadata from .ts sources.
    entities: [path.join(__dirname, 'libs/database/dist/lib/entities/**/*.entity.{ts,js}')],
    // Only migration class files live under migrations/.
    migrations: [path.join(__dirname, 'libs/database/src/lib/migrations/**/*.{ts,js}')],
    synchronize: false,
});
