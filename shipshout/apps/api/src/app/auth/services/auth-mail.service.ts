import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthMailService {
    private readonly log = new Logger(AuthMailService.name);

    async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
        const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000';
        const link = `${apiBase}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
        await this.send(to, 'Verify your ShipShout account', `Click to verify your email:\n\n${link}\n\nThis link expires in 24 hours.`);
    }

    async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
        const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:4200';
        const link = `${webBase}/reset-password?token=${encodeURIComponent(rawToken)}`;
        await this.send(to, 'Reset your ShipShout password', `Click to reset your password:\n\n${link}\n\nThis link expires in 1 hour.`);
    }

    private async send(to: string, subject: string, text: string): Promise<void> {
        const key = process.env.RESEND_API_KEY;
        const from = process.env.AUTH_EMAIL_FROM ?? 'ShipShout <onboarding@resend.dev>';
        if (!key) {
            this.log.warn(`RESEND_API_KEY not set — would email ${to}: ${subject}`);
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [to], subject, text }),
        });
        if (!res.ok) this.log.error(`Resend failed (${res.status}): ${await res.text()}`);
    }
}
