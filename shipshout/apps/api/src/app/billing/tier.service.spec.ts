import { TierService } from './tier.service';
import { Tier } from '@shipshout/database';

function make(tier: Tier, repoCount: number, releases: number) {
    const subs = { findForWorkspace: jest.fn(async () => ({ tier })) };
    const repos = { count: jest.fn(async () => repoCount) };
    const usage = {
        findForWorkspaceAndPeriod: jest.fn(async () => ({ id: 'u1', releasesProcessed: releases })),
        create: (d: any) => d,
        save: jest.fn(async (d: any) => d),
    };
    return { subs, repos, usage, svc: new TierService(subs as any, repos as any, usage as any) };
}

describe('TierService', () => {
    it('blocks adding a repo beyond starter limit', async () => {
        const { svc } = make(Tier.Starter, 1, 0);
        await expect(svc.assertCanAddRepo('w1')).rejects.toThrow(/limit/i);
    });
    it('consumes a release under the cap and increments', async () => {
        const { svc, usage } = make(Tier.Starter, 1, 5);
        expect(await svc.tryConsumeRelease('w1')).toBe(true);
        expect(usage.save).toHaveBeenCalledWith(expect.objectContaining({ releasesProcessed: 6 }));
    });
    it('rejects a release at the cap', async () => {
        const { svc } = make(Tier.Starter, 1, 10);
        expect(await svc.tryConsumeRelease('w1')).toBe(false);
    });
});
