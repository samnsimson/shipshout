import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

export abstract class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    constructor(entity: EntityTarget<Entity>, dataSource: DataSource) {
        super(entity, dataSource.createEntityManager());
    }
}
