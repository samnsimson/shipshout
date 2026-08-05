export interface CounterStore {
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<void>;
}

export class RateLimiter {
    constructor(
        private store: CounterStore,
        private limit: number,
        private windowSeconds: number,
    ) {}

    async check(key: string): Promise<{ allowed: boolean; remaining: number }> {
        const n = await this.store.incr(key);
        if (n === 1) await this.store.expire(key, this.windowSeconds);
        return { allowed: n <= this.limit, remaining: Math.max(0, this.limit - n) };
    }
}
