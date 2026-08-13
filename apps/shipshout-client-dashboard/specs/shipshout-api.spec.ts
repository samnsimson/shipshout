import { cookies } from 'next/headers';
import { ShipshoutApiUtils } from '@/lib/shipshout-api';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

describe('ShipshoutApiUtils.buildRequestHeaders', () => {
    beforeEach(() => {
        process.env.CLIENT_APP_URL = 'http://localhost:3000';
        jest.mocked(cookies).mockReset();
    });

    it('includes Cookie, origin, and referer when cookies exist', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [{ name: 'auth_token', value: 'jwt.access' }],
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ShipshoutApiUtils.buildRequestHeaders();

        expect(headers.Cookie).toBe('auth_token=jwt.access');
        expect(headers.origin).toBe('http://localhost:3000');
        expect(headers.referer).toBe('http://localhost:3000/');
    });

    it('omits Cookie when cookie store is empty', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [],
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ShipshoutApiUtils.buildRequestHeaders();

        expect(headers.Cookie).toBeUndefined();
        expect(headers.origin).toBe('http://localhost:3000');
    });

    it('merges extra headers', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [],
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ShipshoutApiUtils.buildRequestHeaders({ 'content-type': 'application/json' });

        expect(headers['content-type']).toBe('application/json');
    });
});
