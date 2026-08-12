export class BillingUtils {
    static formatLimit(value: number | null): string {
        if (value === null) return 'Unlimited';
        return String(value);
    }

    static formatChannels(channels: string[]): string {
        if (channels.length === 0) return 'None';
        return channels
            .map((key) =>
                key
                    .split('_')
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' '),
            )
            .join(', ');
    }

    static formatMoney(amountDue: number, currency: string): string {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amountDue / 100);
    }

    static asString(value: unknown): string | null {
        return typeof value === 'string' ? value : null;
    }

    static asNumber(value: unknown): number | null {
        return typeof value === 'number' ? value : null;
    }

    static clientAppUrl(): string {
        return (process.env.CLIENT_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    }
}
