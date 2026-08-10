import { Injectable, Logger } from '@nestjs/common';

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

    async send(message: EmailMessage): Promise<void> {
        this.logger.log(`Email to=${message.to} subject=${message.subject} text=${message.text ?? ''} html=${message.html ?? ''}`);
    }
}
