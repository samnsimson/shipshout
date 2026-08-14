import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Subscription, UsageCounter } from '@shipshout/database';

@Injectable()
export class SubscriptionRepository extends BaseRepository<Subscription> {
    constructor(@InjectRepository(Subscription) repo: Repository<Subscription>) {
        super(repo);
    }

    findForWorkspace(workspaceId: string) {
        return this.findOne({ where: { workspace: { id: workspaceId } } });
    }
}

@Injectable()
export class UsageCounterRepository extends BaseRepository<UsageCounter> {
    constructor(@InjectRepository(UsageCounter) repo: Repository<UsageCounter>) {
        super(repo);
    }

    findForWorkspaceAndPeriod(workspaceId: string, period: string) {
        return this.findOne({ where: { workspace: { id: workspaceId }, period } });
    }
}
