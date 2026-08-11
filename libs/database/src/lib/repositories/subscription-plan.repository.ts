import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlanEntity> {
    constructor(dataSource: DataSource) {
        super(SubscriptionPlanEntity, dataSource);
    }

    findActiveOrdered(): Promise<SubscriptionPlanEntity[]> {
        return this.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
    }

    findActiveByName(name: string): Promise<SubscriptionPlanEntity | null> {
        return this.findOne({ where: { name, isActive: true } });
    }
}
