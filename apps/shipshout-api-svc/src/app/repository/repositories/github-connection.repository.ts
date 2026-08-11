import { BaseRepository, GithubConnectionEntity } from '@shipshout/database';

export class GithubConnectionRepository extends BaseRepository<GithubConnectionEntity> {
    findByUserId(userId: string): Promise<GithubConnectionEntity | null> {
        return this.findOne({ where: { userId } });
    }

    async upsertForUser(userId: string, data: Pick<GithubConnectionEntity, 'githubUserId' | 'githubUsername' | 'accessToken' | 'scopes'>): Promise<void> {
        await this.upsert({ userId, ...data }, ['userId']);
        return undefined;
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.delete({ userId });
        return undefined;
    }
}
