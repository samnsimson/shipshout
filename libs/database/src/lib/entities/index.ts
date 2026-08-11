import { GithubConnectionEntity } from './github-connection.entity';
import { LinkedRepositoryEntity } from './linked-repository.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';

/** Entity classes for Nest `DataSource` registration (same references repos import). */
export const ENTITIES = [GithubConnectionEntity, LinkedRepositoryEntity, SubscriptionPlanEntity];

export { GithubConnectionEntity, LinkedRepositoryEntity, SubscriptionPlanEntity };
export type { SubscriptionPlanLimits } from './subscription-plan.entity';

