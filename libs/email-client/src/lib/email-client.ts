import { Logger } from '@nestjs/common';
import { CreateEmailOptions, Resend } from 'resend';

export const DEFAULT_EMAIL_FROM = 'Shipshout <onboarding@resend.dev>';

export type EmailMessage = {
    to: string;
    subject: string;
    html?: string;
    text?: string;
};

export class EmailClient {
    private readonly logger = new Logger(EmailClient.name);
    private readonly resend: Resend;
    private readonly from: string;

    constructor(apiKey: string, from = DEFAULT_EMAIL_FROM) {
        this.resend = new Resend(apiKey);
        this.from = from;
    }

    private buildPayload(message: EmailMessage): CreateEmailOptions {
        const from = this.from.trim();
        const to = message.to.trim();
        const subject = message.subject.trim();
        return message.html ? { from, to, subject, html: message.html, text: message.text } : { from, to, subject, text: message.text ?? '' };
    }

    async send(message: EmailMessage): Promise<void> {
        try {
            const payload = this.buildPayload(message);
            const { error } = await this.resend.emails.send(payload);
            if (error) throw new Error(error.message);
            this.logger.log(`Resend sent to=${message.to} subject=${message.subject}`);
        } catch (error: unknown) {
            if (error instanceof Error) {
                this.logger.error(`Resend failed to=${message.to} subject=${message.subject}: ${error.message}`);
                throw error;
            } else {
                this.logger.error(`Resend failed to=${message.to} subject=${message.subject}: Unknown error`);
                throw new Error('Unknown error');
            }
        }
    }
}
