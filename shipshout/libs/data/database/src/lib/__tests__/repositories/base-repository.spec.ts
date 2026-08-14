import { Repository } from 'typeorm';
import { BaseRepository } from '../../repositories/base-repository.js';

class Entity {
    id!: string;
}

describe('BaseRepository', () => {
    it('wraps a TypeORM repository', () => {
        const repository = { target: Entity, manager: { findOne: jest.fn() } } as Repository<Entity>;

        class TestRepo extends BaseRepository<Entity> {
            constructor() {
                super(repository);
            }
        }

        new TestRepo();
    });
});
