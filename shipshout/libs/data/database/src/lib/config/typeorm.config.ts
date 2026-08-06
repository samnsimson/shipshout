import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Workspace } from '../entities/workspace.entity.js';
import { Membership } from '../entities/membership.entity.js';
import { Repository } from '../entities/repository.entity.js';
import { BrandProfile } from '../entities/brand-profile.entity.js';
import { ReleaseEvent } from '../entities/release-event.entity.js';
import { Draft } from '../entities/draft.entity.js';
import { ChannelConnection } from '../entities/channel-connection.entity.js';
import { PublishRecord } from '../entities/publish-record.entity.js';
import { Subscription } from '../entities/subscription.entity.js';
import { UsageCounter } from '../entities/usage-counter.entity.js';

const entities: Function[] = [
    User,
    Workspace,
    Membership,
    Repository,
    BrandProfile,
    ReleaseEvent,
    Draft,
    ChannelConnection,
    PublishRecord,
    Subscription,
    UsageCounter,
];
export const ENTITIES = entities;

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');

export function buildTypeOrmOptions(databaseUrl: string, opts?: { migrations?: boolean }): DataSourceOptions {
    return {
        type: 'postgres',
        url: databaseUrl,
        synchronize: false,
        entities,
        ...(opts?.migrations ? { migrations: [join(migrationsDir, '*.js')] } : {}),
    };
}
