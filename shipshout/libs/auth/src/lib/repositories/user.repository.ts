import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, User } from '@shipshout/database';

@Injectable()
export class UserRepository extends BaseRepository<User> {
    constructor(@InjectRepository(User) repo: Repository<User>) {
        super(repo);
    }

    findByGithubId(githubId: string) {
        return this.findOneBy({ githubId });
    }
}
