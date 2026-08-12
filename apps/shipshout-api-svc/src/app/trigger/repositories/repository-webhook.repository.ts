import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, RepositoryWebhookEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class RepositoryWebhookRepository extends BaseRepository<RepositoryWebhookEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(RepositoryWebhookEntity, dataSource);
    }

    findByLinkedRepositoryId(linkedRepositoryId: string): Promise<RepositoryWebhookEntity | null> {
        return this.findOne({ where: { linkedRepositoryId } });
    }

    findByDeliveryToken(deliveryToken: string): Promise<RepositoryWebhookEntity | null> {
        return this.findOne({ where: { deliveryToken }, relations: { linkedRepository: true } });
    }
}
