import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, LinkedRepositoryEntity } from '@shipshout/database';
import { DataSource, DeleteResult } from 'typeorm';

@Injectable()
export class LinkedRepositoryRepository extends BaseRepository<LinkedRepositoryEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(LinkedRepositoryEntity, dataSource);
    }

    findByUserId(userId: string): Promise<LinkedRepositoryEntity[]> {
        return this.find({ where: { userId }, order: { linkedAt: 'DESC' } });
    }

    saveLinked(
        userId: string,
        data: Pick<LinkedRepositoryEntity, 'githubRepoId' | 'fullName' | 'name' | 'owner' | 'defaultBranch' | 'private' | 'htmlUrl'>,
    ): Promise<LinkedRepositoryEntity> {
        return this.save({ userId, ...data });
    }

    deleteByIdAndUserId(id: string, userId: string): Promise<DeleteResult> {
        return this.delete({ id, userId });
    }
}
