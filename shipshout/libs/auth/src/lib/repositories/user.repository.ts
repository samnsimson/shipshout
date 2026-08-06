import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, User } from '@shipshout/database';
import { normalizeEmail } from '../utils/auth-error.js';

@Injectable()
export class UserRepository extends BaseRepository<User> {
    constructor(@InjectRepository(User) repo: Repository<User>) {
        super(repo);
    }

    findByEmail(email: string) {
        return this.findOneBy({ email: normalizeEmail(email) });
    }
}
