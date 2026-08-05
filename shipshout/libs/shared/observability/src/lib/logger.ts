import pino from 'pino';

export function createLogger(name: string) {
    return pino({
        name,
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
    });
}

export function initSentry() {
    if (!process.env.SENTRY_DSN) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node') as typeof import('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
