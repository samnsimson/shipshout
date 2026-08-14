import { buildTypeOrmOptions } from '@shipshout/database';

export function buildApiTypeOrmOptions() {
    return buildTypeOrmOptions(process.env.DATABASE_URL ?? '');
}
