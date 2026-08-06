import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken, AuthTokenType, BaseRepository } from '@shipshout/database';
import { generateRawToken, hashToken } from '../utils/token-hash.js';

@Injectable()
export class AuthTokenRepository extends BaseRepository<AuthToken> {
    constructor(@InjectRepository(AuthToken) repo: Repository<AuthToken>) {
        super(repo);
    }

    async createToken(userId: string, type: AuthTokenType, expiresAt: Date): Promise<{ token: AuthToken; raw: string }> {
        const raw = generateRawToken();
        const token = await this.save(
            this.create({
                userId,
                type,
                tokenHash: hashToken(raw),
                expiresAt,
            }),
        );
        return { token, raw };
    }

    async consumeByRawToken(type: AuthTokenType, raw: string) {
        const row = await this.findOne({
            where: { type, tokenHash: hashToken(raw) },
            relations: { user: true },
        });
        if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
        row.usedAt = new Date();
        await this.save(row);
        return row.user;
    }
}
