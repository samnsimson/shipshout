import { LoggerService, LogLevel } from '@nestjs/common';
import { Logger as PinoInstance } from 'pino';
import { createPinoRoot } from './logger';

const PINO_LEVELS: Record<LogLevel, string> = {
    log: 'info',
    error: 'error',
    warn: 'warn',
    debug: 'debug',
    verbose: 'trace',
    fatal: 'fatal',
};

export class PinoLoggerService implements LoggerService {
    private readonly pino: PinoInstance;

    constructor(appName = 'app') {
        this.pino = createPinoRoot(appName);
    }

    log(message: unknown, context?: string) {
        this.child(context).info(this.toLogObject(message));
    }

    error(message: unknown, stack?: string, context?: string) {
        const obj = this.toLogObject(message);
        if (stack) obj.stack = stack;
        this.child(context).error(obj);
    }

    warn(message: unknown, context?: string) {
        this.child(context).warn(this.toLogObject(message));
    }

    debug(message: unknown, context?: string) {
        this.child(context).debug(this.toLogObject(message));
    }

    verbose(message: unknown, context?: string) {
        this.child(context).trace(this.toLogObject(message));
    }

    fatal(message: unknown, context?: string) {
        this.child(context).fatal(this.toLogObject(message));
    }

    setLogLevels(levels: LogLevel[]) {
        const enabled = new Set(levels);
        const order: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
        for (const nestLevel of order) {
            if (enabled.has(nestLevel)) {
                this.pino.level = PINO_LEVELS[nestLevel];
                return;
            }
        }
        this.pino.level = 'silent';
    }

    private child(context?: string): PinoInstance {
        return context ? this.pino.child({ context }) : this.pino;
    }

    private toLogObject(message: unknown): Record<string, unknown> {
        if (typeof message === 'string') return { msg: message };
        if (message instanceof Error) return { msg: message.message, err: message };
        if (typeof message === 'object' && message !== null) return message as Record<string, unknown>;
        return { msg: String(message) };
    }
}
