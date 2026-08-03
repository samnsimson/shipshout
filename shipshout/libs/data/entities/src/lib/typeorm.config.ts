import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSourceOptions } from 'typeorm';
import { User } from './entities/user.entity.js';
import { Workspace } from './entities/workspace.entity.js';
import { Membership } from './entities/membership.entity.js';
import { Repository } from './entities/repository.entity.js';
import { BrandProfile } from './entities/brand-profile.entity.js';
import { ReleaseEvent } from './entities/release-event.entity.js';

export const ENTITIES: Function[] = [
  User,
  Workspace,
  Membership,
  Repository,
  BrandProfile,
  ReleaseEvent,
];

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    entities: ENTITIES,
    migrations: [join(migrationsDir, '*.js')],
  };
}
