export const EMAIL_ADAPTER = Symbol('EMAIL_ADAPTER');

export type EmailMessage = {
    to: string;
    subject: string;
    html?: string;
    text?: string;
};

export interface EmailAdapter {
    send(message: EmailMessage): Promise<void>;
}
