import { GithubConnectionEntity } from './github-connection.entity';
import { LinkedRepositoryEntity } from './linked-repository.entity';
import { RepositoryTriggerEntity } from './repository-trigger.entity';
import { RepositoryWebhookEntity } from './repository-webhook.entity';
import { ShoutoutEntity } from './shoutout.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';
import { TriggerEventEntity } from './trigger-event.entity';

/** Entity classes for Nest `DataSource` registration (same references repos import). */
export const ENTITIES = [
    GithubConnectionEntity,
    LinkedRepositoryEntity,
    RepositoryTriggerEntity,
    RepositoryWebhookEntity,
    TriggerEventEntity,
    ShoutoutEntity,
    SubscriptionPlanEntity,
];

export { GithubConnectionEntity, LinkedRepositoryEntity, RepositoryTriggerEntity, RepositoryWebhookEntity, ShoutoutEntity, SubscriptionPlanEntity, TriggerEventEntity };
export type { RepositoryWebhookStatus } from './repository-webhook.entity';
export type { ShoutoutStatus } from './shoutout.entity';
export type { TriggerEventStatus, TriggerEventType } from './trigger-event.entity';
export type { SubscriptionPlanLimits } from './subscription-plan.entity';

