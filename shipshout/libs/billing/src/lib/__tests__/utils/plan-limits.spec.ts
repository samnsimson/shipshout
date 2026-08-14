import { PLAN_LIMITS, checkRepoLimit, checkReleaseLimit } from '../../utils/plan-limits';
import { Tier } from '@shipshout/database';

describe('plan limits', () => {
    it('starter allows 1 repo, 10 releases', () => {
        expect(PLAN_LIMITS[Tier.Starter].maxRepos).toBe(1);
        expect(checkRepoLimit(Tier.Starter, 1)).toBe(false);
        expect(checkReleaseLimit(Tier.Starter, 10)).toBe(false);
    });
    it('pro allows unlimited releases', () => {
        expect(checkReleaseLimit(Tier.Pro, 9999)).toBe(true);
    });
    it('growth allows unlimited repos', () => {
        expect(checkRepoLimit(Tier.Growth, 9999)).toBe(true);
    });
});
