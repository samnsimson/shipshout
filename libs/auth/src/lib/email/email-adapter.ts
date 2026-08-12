import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEmailOptions, Resend } from 'resend';

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
        this.from = this.configService.get<string>('EMAIL_FROM')?.trim() || 'Shipshout <onboarding@resend.dev>';
        this.resend = new Resend(apiKey);
    }

    private async buildPayload(message: EmailMessage): Promise<CreateEmailOptions> {
        const from = this.from.trim();
        const to = message.to.trim();
        const subject = message.subject.trim();
        return message.html ? { from, to, subject, html: message.html, text: message.text } : { from, to, subject, text: message.text ?? '' };
    }

    async send(message: EmailMessage): Promise<void> {
        try {
            const payload = await this.buildPayload(message);
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
