import { buildTypeOrmOptions } from '@shipshout/data-entities';

export function buildApiTypeOrmOptions() {
  return buildTypeOrmOptions(process.env.DATABASE_URL ?? '');
}
