import { ChannelUtils } from '../channels.utils';

describe('ChannelUtils.filterGeneratable', () => {
    const rows = [
        { channelKey: 'email_alert', enabled: true },
        { channelKey: 'x', enabled: true },
        { channelKey: 'linkedin', enabled: false },
        { channelKey: 'linkedin', enabled: true },
    ];

    it('returns enabled plan channels excluding email_alert', () => {
        const result = ChannelUtils.filterGeneratable(rows, ['email_alert', 'x', 'linkedin']);
        expect(result).toEqual([
            { channelKey: 'x', enabled: true },
            { channelKey: 'linkedin', enabled: true },
        ]);
    });

    it('excludes channels not on plan even when enabled', () => {
        const result = ChannelUtils.filterGeneratable(rows, ['email_alert', 'x']);
        expect(result).toEqual([{ channelKey: 'x', enabled: true }]);
    });
});
