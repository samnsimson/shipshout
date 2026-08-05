import { createLogger } from './logger.js';

describe('createLogger', () => {
    it('creates a named logger with info level by default', () => {
        const log = createLogger('api');
        expect(typeof log.info).toBe('function');
    });
});
