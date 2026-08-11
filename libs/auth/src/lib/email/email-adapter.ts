import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEmailOptions, Resend } from 'resend';

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
    private readonly resend: Resend;
    private readonly from: string;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY')?.trim();
        this.resend = new Resend(apiKey);
        this.from = this.configService.get<string>('EMAIL_FROM')?.trim() || 'Shipshout <onboarding@resend.dev>';
    }

    async send(message: EmailMessage): Promise<void> {
        const payload: CreateEmailOptions = message.html
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
