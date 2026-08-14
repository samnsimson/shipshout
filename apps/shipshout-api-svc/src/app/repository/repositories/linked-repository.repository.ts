import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, LinkedRepositoryEntity } from '@shipshout/database';
import { DataSource, DeleteResult, In, Not } from 'typeorm';

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

    async findClaimedGithubRepoIds(githubRepoIds: string[], excludeUserId: string): Promise<Set<string>> {
        if (githubRepoIds.length === 0) return new Set();
        const rows = await this.find({
            where: { githubRepoId: In(githubRepoIds), userId: Not(excludeUserId) },
            select: { githubRepoId: true },
        });
        return new Set(rows.map((row) => row.githubRepoId));
    }

    async findDuplicateGroups(): Promise<LinkedRepositoryEntity[][]> {
        const rows = await this.find({ order: { githubRepoId: 'ASC', linkedAt: 'ASC' } });
        const byGithubRepoId = new Map<string, LinkedRepositoryEntity[]>();
        for (const row of rows) {
            const group = byGithubRepoId.get(row.githubRepoId) ?? [];
            group.push(row);
            byGithubRepoId.set(row.githubRepoId, group);
        }
        return [...byGithubRepoId.values()].filter((group) => group.length > 1);
    }

    async deleteById(id: string): Promise<void> {
        await this.delete({ id });
    }
}
