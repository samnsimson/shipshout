import { EntitySchema } from 'typeorm';
import { GithubConnectionEntity } from './github-connection.entity';
import { LinkedRepositoryEntity } from './linked-repository.entity';

export type DatabaseEntity = (new () => object) | EntitySchema;

export const ENTITIES: DatabaseEntity[] = [GithubConnectionEntity, LinkedRepositoryEntity];

export { GithubConnectionEntity, LinkedRepositoryEntity };
