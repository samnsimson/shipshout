import { Tier } from '@shipshout/database';

export const PLAN_LIMITS: Record<
    Tier,
    {
        maxRepos: number;
        maxReleasesPerMonth: number;
        socialApiSync: boolean;
        sourceIntegrations: boolean;
        emailDigests: boolean;
    }
> = {
    [Tier.Starter]: { maxRepos: 1, maxReleasesPerMonth: 10, socialApiSync: false, sourceIntegrations: false, emailDigests: false },
    [Tier.Pro]: { maxRepos: 3, maxReleasesPerMonth: Infinity, socialApiSync: true, sourceIntegrations: false, emailDigests: false },
    [Tier.Growth]: { maxRepos: Infinity, maxReleasesPerMonth: Infinity, socialApiSync: true, sourceIntegrations: true, emailDigests: true },
};

export const checkRepoLimit = (tier: Tier, current: number) => current < PLAN_LIMITS[tier].maxRepos;
export const checkReleaseLimit = (tier: Tier, thisMonth: number) => thisMonth < PLAN_LIMITS[tier].maxReleasesPerMonth;
