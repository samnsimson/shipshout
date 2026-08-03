import { buildTypeOrmOptions } from '@shipshout/database';

export function buildWorkerTypeOrmOptions() {
    return buildTypeOrmOptions(process.env.DATABASE_URL ?? '');
}
