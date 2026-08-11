import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export const EMAIL_ADAPTER = Symbol('EMAIL_ADAPTER');

export type EmailMessage = {
    to: string;
    subject: string;
    html?: string;
    text?: string;
};

@Injectable()
export class EmailAdapter {
    private readonly logger = new Logger(EmailAdapter.name);
    private readonly resend: Resend | null;
    private readonly from: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY?.trim();
        this.resend = apiKey ? new Resend(apiKey) : null;
        this.from = process.env.EMAIL_FROM?.trim() || 'Shipshout <onboarding@resend.dev>';
    }

    async send(message: EmailMessage): Promise<void> {
        if (!this.resend) {
            this.logger.log(`Email to=${message.to} subject=${message.subject} text=${message.text ?? ''} html=${message.html ?? ''}`);
            return;
        }

        const payload = message.html
            ? { from: this.from, to: message.to, subject: message.subject, html: message.html, text: message.text }
            : { from: this.from, to: message.to, subject: message.subject, text: message.text ?? '' };
        const { error } = await this.resend.emails.send(payload);
        if (error) {
            this.logger.error(`Resend failed to=${message.to} subject=${message.subject}: ${error.message}`);
            throw new Error(error.message);
        }
        this.logger.log(`Resend sent to=${message.to} subject=${message.subject}`);
    }
}
