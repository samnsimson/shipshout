import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
    transactionId: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
    run<T>(store: RequestContextStore, fn: () => T): T {
        return storage.run(store, fn);
    },

    getTransactionId(): string | undefined {
        return storage.getStore()?.transactionId;
    },
};
