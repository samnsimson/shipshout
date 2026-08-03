import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, ReleaseEvent } from '@shipshout/database';

@Injectable()
export class ReleaseEventRepository extends BaseRepository<ReleaseEvent> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ReleaseEvent, dataSource);
    }

    findByDeliveryId(repositoryId: string, deliveryId: string) {
        return this.findOne({ where: { repository: { id: repositoryId }, deliveryId } });
    }
}
