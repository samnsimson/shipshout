import { DataSource } from 'typeorm';
import { BaseRepository } from './base-repository.js';

class Entity {
    id!: string;
}

describe('BaseRepository', () => {
    it('creates a TypeORM repository from the DataSource', () => {
        const manager = { findOne: jest.fn() };
        const dataSource = {
            createEntityManager: jest.fn(() => manager),
        } as unknown as DataSource;

        class TestRepo extends BaseRepository<Entity> {
            constructor() {
                super(Entity, dataSource);
            }
        }

        new TestRepo();
        expect(dataSource.createEntityManager).toHaveBeenCalled();
    });
});
