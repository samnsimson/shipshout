import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSourceOptions } from 'typeorm';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { Membership } from './entities/membership.entity';
import { Repository } from './entities/repository.entity';
import { BrandProfile } from './entities/brand-profile.entity';
import { ReleaseEvent } from './entities/release-event.entity';
import { Draft } from './entities/draft.entity';
import { ChannelConnection } from './entities/channel-connection.entity';
import { PublishRecord } from './entities/publish-record.entity';
import { Subscription } from './entities/subscription.entity';
import { UsageCounter } from './entities/usage-counter.entity';

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

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export function buildTypeOrmOptions(databaseUrl: string, opts?: { migrations?: boolean }): DataSourceOptions {
    return {
        type: 'postgres',
        url: databaseUrl,
        synchronize: false,
        entities,
        ...(opts?.migrations ? { migrations: [join(migrationsDir, '*.js')] } : {}),
    };
}
