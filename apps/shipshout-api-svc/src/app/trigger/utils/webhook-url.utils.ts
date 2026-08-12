export class WebhookUrlUtils {
    static isLocalhost(url: string): boolean {
        try {
            const host = new URL(url).hostname.toLowerCase();
            return host === 'localhost' || host === '127.0.0.1' || host === '::1';
        } catch {
            return false;
        }
    }

    static localhostManualMessage(): string {
        return 'GitHub cannot auto-register webhooks to localhost. Set API_BASE_URL to a public URL (e.g. ngrok) and save again, or add the webhook manually below.';
    }
}
