import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class UserEmailLookup {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async findByUserId(userId: string): Promise<string | null> {
        try {
            const rows = (await this.dataSource.query(`SELECT email FROM "user" WHERE id = $1 LIMIT 1`, [userId])) as Array<{ email: string }>;
            return rows[0]?.email ?? null;
        } catch {
            return null;
        }
    }
}
