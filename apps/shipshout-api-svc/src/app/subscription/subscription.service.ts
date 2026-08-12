import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpHeadersUtils } from '../common/http-headers.utils';
import { SubscriptionPlanLimits, SubscriptionPlanRepository } from '@shipshout/database';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { IncomingHttpHeaders } from 'node:http';
import { SubscriptionMeResponseDto, SubscriptionPlansListResponseDto } from './dto/subscription-response.dto';

type ListedSubscription = {
    status?: string | null;
    plan?: string | null;
    periodEnd?: Date | string | null;
    stripeSubscriptionId?: string | null;
    limits?: SubscriptionPlanLimits | null;
};

type BetterAuthApi = {
    api: {
        listActiveSubscriptions: (args: { headers: Headers; query: Record<string, unknown> }) => Promise<ListedSubscription[] | null>;
    };
};


@Injectable()
export class SubscriptionService {
    constructor(
        private readonly plans: SubscriptionPlanRepository,
        private readonly betterAuth: BetterAuthService,
    ) {}

    async listPlans(): Promise<SubscriptionPlansListResponseDto> {
        const rows = await this.plans.findActiveOrdered();
        return {
            plans: rows.map((row) => ({
                name: row.name,
                displayName: row.displayName,
                trialDays: row.trialDays,
                limits: row.limits,
                isBillable: Boolean(row.stripePriceId),
            })),
        };
    }

    async getMe(_userId: string, headers: IncomingHttpHeaders): Promise<SubscriptionMeResponseDto> {
        const listed = await (this.betterAuth as unknown as BetterAuthApi).api.listActiveSubscriptions({
            headers: HttpHeadersUtils.toWebHeaders(headers),
            query: {},
        });

        const active = (listed ?? []).find((sub) => sub.status === 'active' || sub.status === 'trialing');
        if (!active?.plan) {
            const free = await this.plans.findActiveByName('free');
            if (!free) throw new NotFoundException('Free plan is not configured');
            return { plan: 'free', status: null, periodEnd: null, stripeSubscriptionId: null, limits: free.limits };
        }

        const planRow = await this.plans.findActiveByName(active.plan);
        const limits = planRow?.limits ?? active.limits ?? { repos: 0, releasesPerMonth: 0 };
        const periodEnd = active.periodEnd ? new Date(active.periodEnd).toISOString() : null;
        return {
            plan: active.plan,
            status: active.status ?? null,
            periodEnd,
            stripeSubscriptionId: active.stripeSubscriptionId ?? null,
            limits,
        };
    }
}
