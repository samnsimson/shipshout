import { RateLimiter } from '../../utils/rate-limiter';

function fakeStore() {
    const counts = new Map<string, number>();
    return {
        counts,
        incr: jest.fn(async (k: string) => {
            const n = (counts.get(k) ?? 0) + 1;
            counts.set(k, n);
            return n;
        }),
        expire: jest.fn(async () => {}),
    };
}

describe('RateLimiter', () => {
    it('allows up to the limit then blocks', async () => {
        const store = fakeStore();
        const rl = new RateLimiter(store as any, 3, 60);
        expect((await rl.check('ip:1')).allowed).toBe(true);
        await rl.check('ip:1');
        await rl.check('ip:1');
        expect((await rl.check('ip:1')).allowed).toBe(false);
    });
});
