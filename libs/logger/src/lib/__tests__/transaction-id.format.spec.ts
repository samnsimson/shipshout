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

    it('adds message prefix inside ALS without metadata field', () => {
        RequestContext.run({ transactionId: 'abc-123' }, () => {
            const info = format.transform({ level: 'info', message: 'hello' }, {}) as {
                message: string;
                transactionId?: string;
            };

            expect(info.message).toBe('[abc-123] hello');
            expect(info.transactionId).toBeUndefined();
        });
    });

    it('does not double-prefix an already prefixed message', () => {
        RequestContext.run({ transactionId: 'abc-123' }, () => {
            const info = format.transform({ level: 'info', message: '[abc-123] hello' }, {}) as {
                message: string;
            };

            expect(info.message).toBe('[abc-123] hello');
        });
    });
});
