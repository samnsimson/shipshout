import { SubscriptionPlanLimits } from '@shipshout/database';

export class ShoutoutLimitUtils {
    static isWithinMonthlyLimit(count: number, limits: SubscriptionPlanLimits): boolean {
        if (limits.releasesPerMonth === null) return true;
        return count < limits.releasesPerMonth;
    }

    static monthStart(date = new Date()): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }
}
