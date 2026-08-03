import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config.js';

export const AppDataSource = new DataSource(
  buildTypeOrmOptions(process.env.DATABASE_URL ?? ''),
);
