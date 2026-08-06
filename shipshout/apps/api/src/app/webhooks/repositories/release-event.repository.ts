import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, ReleaseEvent, ReleaseEventStatus } from '@shipshout/database';

@Injectable()
export class ReleaseEventRepository extends BaseRepository<ReleaseEvent> {
    constructor(@InjectRepository(ReleaseEvent) repo: Repository<ReleaseEvent>) {
        super(repo);
    }

    findByDeliveryId(repositoryId: string, deliveryId: string) {
        return this.findOne({ where: { repository: { id: repositoryId }, deliveryId } });
    }

    async findLatestByRepositoryIds(repositoryIds: string[]) {
        if (repositoryIds.length === 0) return new Map<string, { createdAt: Date; status: ReleaseEventStatus }>();
        const events = await this.createQueryBuilder('e')
            .innerJoinAndSelect('e.repository', 'r')
            .where('e.repositoryId IN (:...ids)', { ids: repositoryIds })
            .distinctOn(['e.repositoryId'])
            .orderBy('e.repositoryId', 'ASC')
            .addOrderBy('e.createdAt', 'DESC')
            .getMany();
        return new Map(events.map((e) => [e.repository.id, { createdAt: e.createdAt, status: e.status }]));
    }
}
