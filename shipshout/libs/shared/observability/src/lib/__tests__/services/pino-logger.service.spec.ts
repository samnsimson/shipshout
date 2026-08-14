import { PinoLoggerService } from '../../services/pino-logger.service';

describe('PinoLoggerService', () => {
    it('implements Nest LoggerService methods', () => {
        const logger = new PinoLoggerService('test');
        expect(typeof logger.log).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
        expect(typeof logger.verbose).toBe('function');
    });

    it('logs without throwing', () => {
        const logger = new PinoLoggerService('test');
        expect(() => logger.log('hello', 'MyService')).not.toThrow();
        expect(() => logger.error('boom', 'stack trace', 'MyService')).not.toThrow();
    });
});
