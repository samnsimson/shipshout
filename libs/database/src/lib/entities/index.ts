import { ChannelTypeEntity } from './channel-type.entity';
import { GithubConnectionEntity } from './github-connection.entity';
import { LinkedRepositoryEntity } from './linked-repository.entity';
import { RepositoryChannelEntity } from './repository-channel.entity';
import { RepositoryTriggerEntity } from './repository-trigger.entity';
import { RepositoryWebhookEntity } from './repository-webhook.entity';
import { ShoutoutChannelDraftEntity } from './shoutout-channel-draft.entity';
import { ShoutoutDispatchLogEntity } from './shoutout-dispatch-log.entity';
import { ShoutoutEntity } from './shoutout.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';
import { TriggerEventEntity } from './trigger-event.entity';

/** Entity classes for Nest `DataSource` registration (same references repos import). */
export const ENTITIES = [
    ChannelTypeEntity,
    GithubConnectionEntity,
    LinkedRepositoryEntity,
    RepositoryChannelEntity,
    RepositoryTriggerEntity,
    RepositoryWebhookEntity,
    TriggerEventEntity,
    ShoutoutEntity,
    ShoutoutChannelDraftEntity,
    ShoutoutDispatchLogEntity,
    SubscriptionPlanEntity,
];

export {
    ChannelTypeEntity,
    GithubConnectionEntity,
    LinkedRepositoryEntity,
    RepositoryChannelEntity,
    RepositoryTriggerEntity,
    RepositoryWebhookEntity,
    ShoutoutChannelDraftEntity,
    ShoutoutDispatchLogEntity,
    ShoutoutEntity,
    SubscriptionPlanEntity,
    TriggerEventEntity,
};
export type { ChannelKind } from './channel-type.entity';
export type { RepositoryChannelTone } from './repository-channel.entity';
export type { RepositoryWebhookStatus } from './repository-webhook.entity';
export type { ShoutoutDispatchStatus } from './shoutout-dispatch-log.entity';
export type { ShoutoutStatus } from './shoutout.entity';
export type { TriggerEventStatus, TriggerEventType } from './trigger-event.entity';
export type { SubscriptionPlanLimits } from './subscription-plan.entity';
