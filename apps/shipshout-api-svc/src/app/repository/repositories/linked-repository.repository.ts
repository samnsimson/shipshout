import { BaseRepository, LinkedRepositoryEntity } from '@shipshout/database';
import { DeleteResult } from 'typeorm';

export class LinkedRepositoryRepository extends BaseRepository<LinkedRepositoryEntity> {
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
