import { Repository } from 'typeorm';
import { GithubConnectionEntity } from '@shipshout/database';
import { createRepositoryProvider } from '../create-repository-provider';
import { BaseRepository } from '../base.repository';

class TestRepository extends BaseRepository<GithubConnectionEntity> {}

describe('createRepositoryProvider', () => {
    it('wraps the TypeORM repository in a BaseRepository subclass', () => {
        const typeOrmRepository = {} as Repository<GithubConnectionEntity>;
        const provider = createRepositoryProvider(TestRepository, GithubConnectionEntity);

        expect(provider.provide).toBe(TestRepository);
        expect(provider.useFactory?.(typeOrmRepository)).toBeInstanceOf(TestRepository);
    });
});
