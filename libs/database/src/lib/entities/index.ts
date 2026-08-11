import { GithubConnectionEntity } from './github-connection.entity';
import { LinkedRepositoryEntity } from './linked-repository.entity';

/** Entity classes for Nest `DataSource` registration (same references repos import). */
export const ENTITIES = [GithubConnectionEntity, LinkedRepositoryEntity];

export { GithubConnectionEntity, LinkedRepositoryEntity };
