import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
    transactionId: string;
};

export class RequestContext {
    private static readonly storage = new AsyncLocalStorage<RequestContextStore>();

    static run<T>(store: RequestContextStore, fn: () => T): T {
        return this.storage.run(store, fn);
    }

    static getTransactionId(): string | undefined {
        return this.storage.getStore()?.transactionId;
    }
}
