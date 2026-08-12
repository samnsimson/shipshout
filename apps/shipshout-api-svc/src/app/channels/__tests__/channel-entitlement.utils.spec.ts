import { ChannelEntitlementUtils } from '../utils/channel-entitlement.utils';

describe('ChannelEntitlementUtils', () => {
    it('canEnable returns true when plan includes channel', () => {
        expect(ChannelEntitlementUtils.canEnable('email_alert', ['email_alert'])).toBe(true);
    });

    it('canEnable returns false when plan excludes channel', () => {
        expect(ChannelEntitlementUtils.canEnable('email_newsletter', ['email_alert'])).toBe(false);
    });

    it('filterEntitled keeps only plan-allowed enabled channels', () => {
        const rows = [
            { channelKey: 'email_alert', enabled: true },
            { channelKey: 'email_newsletter', enabled: true },
        ];
        const result = ChannelEntitlementUtils.filterEntitled(rows, ['email_alert']);
        expect(result.map((r) => r.channelKey)).toEqual(['email_alert']);
    });
});
