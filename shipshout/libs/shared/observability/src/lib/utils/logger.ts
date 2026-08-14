import pino, { type Logger as PinoInstance, type TransportSingleOptions } from 'pino';

function prettyTransport(): TransportSingleOptions | undefined {
    if (process.env.NODE_ENV === 'production' || process.env.LOG_PRETTY === 'false') return undefined;
    try {
        // Webpack replaces require.resolve with a numeric module id — skip transport in that case.
        const target = require.resolve('pino-pretty');
        if (typeof target !== 'string') return undefined;
        return { target };
    } catch {
        return undefined;
    }
}

export function createPinoRoot(name: string): PinoInstance {
    return pino({
        name,
        level: process.env.LOG_LEVEL ?? 'info',
        transport: prettyTransport(),
    });
}

export function createLogger(name: string): PinoInstance {
    return createPinoRoot(name);
}

export function initSentry() {
    if (!process.env.SENTRY_DSN) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node') as typeof import('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
