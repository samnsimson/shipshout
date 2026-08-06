import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, ReleaseEvent } from '@shipshout/database';

@Injectable()
export class ReleaseEventRepository extends BaseRepository<ReleaseEvent> {
    constructor(@InjectRepository(ReleaseEvent) repo: Repository<ReleaseEvent>) {
        super(repo);
    }

    findByDeliveryId(repositoryId: string, deliveryId: string) {
        return this.findOne({ where: { repository: { id: repositoryId }, deliveryId } });
    }
}
