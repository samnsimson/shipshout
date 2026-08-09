import { RequestContext } from '@shipshout/core';
import { transactionIdFormat } from '../transaction-id.format';

describe('transactionIdFormat', () => {
    const format = transactionIdFormat();

    it('leaves info unchanged outside ALS', () => {
        const info = format.transform({ level: 'info', message: 'hello' }, {}) as {
            message: string;
            transactionId?: string;
        };

        expect(info.message).toBe('hello');
        expect(info.transactionId).toBeUndefined();
    });

    it('adds metadata and message prefix inside ALS', () => {
        RequestContext.run({ transactionId: 'abc-123' }, () => {
            const info = format.transform({ level: 'info', message: 'hello' }, {}) as {
                message: string;
                transactionId?: string;
            };

            expect(info.transactionId).toBe('abc-123');
            expect(info.message).toBe('[abc-123] hello');
        });
    });

    it('does not double-prefix an already prefixed message', () => {
        RequestContext.run({ transactionId: 'abc-123' }, () => {
            const info = format.transform({ level: 'info', message: '[abc-123] hello' }, {}) as {
                message: string;
                transactionId?: string;
            };

            expect(info.transactionId).toBe('abc-123');
            expect(info.message).toBe('[abc-123] hello');
        });
    });
});
