import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type AuthSubscriptionRow = {
    plan: string;
    status: string;
    periodEnd: string | null;
    stripeSubscriptionId: string | null;
};

type AuthSubscriptionQueryRow = {
    plan: string;
    status: string;
    periodEnd: Date | string | null;
    stripeSubscriptionId: string | null;
};

@Injectable()
export class AuthSubscriptionRepository {
    private readonly logger = new Logger(AuthSubscriptionRepository.name);

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async findActiveForUser(referenceId: string): Promise<AuthSubscriptionRow | null> {
        try {
            const rows = (await this.dataSource.query(
                `SELECT plan, status, "periodEnd", "stripeSubscriptionId"
                 FROM auth.subscription
                 WHERE "referenceId" = $1
                   AND status IN ('active', 'trialing')
                 ORDER BY "periodStart" DESC NULLS LAST
                 LIMIT 1`,
                [referenceId],
            )) as AuthSubscriptionQueryRow[];
            const row = rows[0];
            if (!row?.plan) return null;
            return {
                plan: row.plan,
                status: row.status,
                periodEnd: row.periodEnd ? new Date(row.periodEnd).toISOString() : null,
                stripeSubscriptionId: row.stripeSubscriptionId,
            };
        } catch (error) {
            this.logger.warn(`Failed to load auth.subscription for user ${referenceId}`, error instanceof Error ? error.stack : error);
            return null;
        }
    }
}
