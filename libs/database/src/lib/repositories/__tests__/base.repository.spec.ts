import { DataSource } from 'typeorm';
import { GithubConnectionEntity } from '../../entities';
import { BaseRepository } from '../base.repository';

class TestRepository extends BaseRepository<GithubConnectionEntity> {}

describe('BaseRepository', () => {
    it('constructs with entity target and DataSource', () => {
        const dataSource = {
            createEntityManager: () => ({}),
        } as unknown as DataSource;

        expect(new TestRepository(GithubConnectionEntity, dataSource)).toBeInstanceOf(TestRepository);
    });
});
