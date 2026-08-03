import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, User } from '@shipshout/database';

@Injectable()
export class UserRepository extends BaseRepository<User> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(User, dataSource);
    }

    findByGithubId(githubId: string) {
        return this.findOneBy({ githubId });
    }
}
