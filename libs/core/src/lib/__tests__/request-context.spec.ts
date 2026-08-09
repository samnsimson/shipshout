import { RequestContext } from '../request-context';

describe('RequestContext', () => {
    it('exposes transactionId inside run and clears after exit', () => {
        expect(RequestContext.getTransactionId()).toBeUndefined();

        let seen: string | undefined;
        RequestContext.run({ transactionId: 'outer' }, () => {
            seen = RequestContext.getTransactionId();
        });

        expect(seen).toBe('outer');
        expect(RequestContext.getTransactionId()).toBeUndefined();
    });

    it('isolates nested run stores', () => {
        RequestContext.run({ transactionId: 'outer' }, () => {
            expect(RequestContext.getTransactionId()).toBe('outer');
            RequestContext.run({ transactionId: 'inner' }, () => {
                expect(RequestContext.getTransactionId()).toBe('inner');
            });
            expect(RequestContext.getTransactionId()).toBe('outer');
        });
    });
});
