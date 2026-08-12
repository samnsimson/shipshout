import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, ShoutoutEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class ShoutoutRepository extends BaseRepository<ShoutoutEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ShoutoutEntity, dataSource);
    }

    findByUserId(userId: string): Promise<ShoutoutEntity[]> {
        return this.find({ where: { userId }, order: { createdAt: 'DESC' }, relations: { linkedRepository: true, triggerEvent: true } });
    }

    findByIdAndUserId(id: string, userId: string): Promise<ShoutoutEntity | null> {
        return this.findOne({ where: { id, userId }, relations: { linkedRepository: true, triggerEvent: true } });
    }

    countForUserSince(userId: string, since: Date): Promise<number> {
        return this.createQueryBuilder('shoutout').where('shoutout.user_id = :userId', { userId }).andWhere('shoutout.created_at >= :since', { since }).getCount();
    }
}
