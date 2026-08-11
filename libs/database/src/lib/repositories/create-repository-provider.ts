import { FactoryProvider, Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';

export function createRepositoryProvider<Entity extends ObjectLiteral, Repo extends BaseRepository<Entity>>(
    RepositoryClass: Type<Repo>,
    entity: Type<Entity>,
): FactoryProvider<Repo> {
    return {
        provide: RepositoryClass,
        inject: [getRepositoryToken(entity)],
        useFactory: (repository: Repository<Entity>) => new RepositoryClass(repository),
    };
}
