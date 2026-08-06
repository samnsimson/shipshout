import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, IdentityProvider, UserIdentity } from '@shipshout/database';

@Injectable()
export class UserIdentityRepository extends BaseRepository<UserIdentity> {
    constructor(@InjectRepository(UserIdentity) repo: Repository<UserIdentity>) {
        super(repo);
    }

    findByProvider(provider: IdentityProvider, providerUserId: string) {
        return this.findOne({ where: { provider, providerUserId }, relations: { user: true } });
    }

    listByUserId(userId: string) {
        return this.find({ where: { userId }, order: { createdAt: 'ASC' } });
    }

    countByUserId(userId: string) {
        return this.count({ where: { userId } });
    }

    findForUserProvider(userId: string, provider: IdentityProvider) {
        return this.findOne({ where: { userId, provider } });
    }
}
