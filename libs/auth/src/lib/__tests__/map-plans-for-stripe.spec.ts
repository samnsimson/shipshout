import { mapPlansForStripe } from '../billing/map-plans-for-stripe';

describe('mapPlansForStripe', () => {
    it('maps billable rows and skips missing price ids', () => {
        const result = mapPlansForStripe([
            { name: 'free', stripePriceId: '', trialDays: null, limits: { repos: 0, releasesPerMonth: 0 } },
            { name: 'starter', stripePriceId: 'price_s', trialDays: 14, limits: { repos: 1, releasesPerMonth: 10 } },
            { name: 'pro', stripePriceId: 'price_p', trialDays: null, limits: { repos: 3, releasesPerMonth: null } },
        ]);
        expect(result).toEqual([
            { name: 'starter', priceId: 'price_s', freeTrial: { days: 14 }, limits: { repos: 1, releasesPerMonth: 10 } },
            { name: 'pro', priceId: 'price_p', limits: { repos: 3, releasesPerMonth: null } },
        ]);
    });
});
