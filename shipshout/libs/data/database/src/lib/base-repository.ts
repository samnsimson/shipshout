import { EntityTarget, ObjectLiteral, Repository, DataSource } from 'typeorm';

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
    constructor(entity: EntityTarget<T>, dataSource: DataSource) {
        super(entity, dataSource.createEntityManager());
    }
}
