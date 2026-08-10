import { Injectable, Logger } from '@nestjs/common';
import { EmailAdapter, EmailMessage } from './email-adapter';

@Injectable()
export class LoggingEmailAdapter implements EmailAdapter {
    private readonly logger = new Logger(LoggingEmailAdapter.name);

    async send(message: EmailMessage): Promise<void> {
        this.logger.log(`Email to=${message.to} subject=${message.subject} text=${message.text ?? ''} html=${message.html ?? ''}`);
    }
}
