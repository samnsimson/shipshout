import { buildTypeOrmOptions } from '@shipshout/data-entities';

export function buildWorkerTypeOrmOptions() {
  return buildTypeOrmOptions(process.env.DATABASE_URL ?? '');
}
