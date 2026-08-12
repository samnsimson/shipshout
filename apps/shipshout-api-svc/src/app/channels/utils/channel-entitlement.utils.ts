export class ChannelEntitlementUtils {
    static canEnable(channelKey: string, planChannels: string[]): boolean {
        return planChannels.includes(channelKey);
    }

    static filterEntitled<T extends { channelKey: string; enabled: boolean }>(rows: T[], planChannels: string[]): T[] {
        return rows.filter((row) => row.enabled && planChannels.includes(row.channelKey));
    }
}
