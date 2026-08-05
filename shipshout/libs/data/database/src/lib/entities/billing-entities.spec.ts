import { ENTITIES } from '../typeorm.config.js';
import { Subscription, Tier, SubscriptionStatus } from './subscription.entity.js';
import { UsageCounter } from './usage-counter.entity.js';

describe('billing entities', () => {
    it('registers entities', () => expect(ENTITIES).toEqual(expect.arrayContaining([Subscription, UsageCounter])));
    it('has tiers + statuses', () => {
        expect(Tier.Starter).toBe('starter');
        expect(Tier.Pro).toBe('pro');
        expect(Tier.Growth).toBe('growth');
        expect(SubscriptionStatus.Active).toBe('active');
    });
});
