import { cookies } from 'next/headers';
import { AuthUtils } from '../src/lib/auth/auth.utils';
import { ApiClientFactory } from '@/lib/api/api-client.factory';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

const authControllerRefresh = jest.fn();

jest.mock('../src/lib/auth/auth.utils', () => ({
    AuthUtils: {
        applyToCookieStore: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('@shipshout/api-client', () => ({
    ApiClient: jest.fn().mockImplementation(() => ({
        authControllerRefresh: (...args: unknown[]) => authControllerRefresh(...args),
    })),
    createClient: jest.fn(() => ({
        interceptors: { request: { use: jest.fn() } },
    })),
    createClientConfig: jest.fn((config: unknown) => config),
    createConfig: jest.fn((config: unknown) => config),
    HeyApiConfigUtils: {
        normalizeBaseUrl: (url: string) => url.replace(/\/$/, ''),
    },
}));

describe('ApiClientFactory.buildRequestHeaders', () => {
    beforeEach(() => {
        process.env.CLIENT_APP_URL = 'http://localhost:3000';
        jest.mocked(cookies).mockReset();
    });

    it('includes Cookie, origin, and referer when cookies exist', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [{ name: 'auth_token', value: 'jwt.access' }],
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ApiClientFactory.buildRequestHeaders();

        expect(headers.Cookie).toBe('auth_token=jwt.access');
        expect(headers.origin).toBe('http://localhost:3000');
        expect(headers.referer).toBe('http://localhost:3000/');
    });

    it('omits Cookie when cookie store is empty', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [],
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ApiClientFactory.buildRequestHeaders();

        expect(headers.Cookie).toBeUndefined();
        expect(headers.origin).toBe('http://localhost:3000');
    });

    it('merges extra headers', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [],
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ApiClientFactory.buildRequestHeaders({ 'content-type': 'application/json' });

        expect(headers['content-type']).toBe('application/json');
    });
});

describe('ApiClientFactory.fetchProtected', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SHIPSHOUT_API_URL = 'http://localhost:8000';
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [{ name: 'auth_token', value: 'old' }],
        } as Awaited<ReturnType<typeof cookies>>);
    });

    it('retries once after a successful refresh on 401', async () => {
        const first = { response: { status: 401, ok: false } };
        const second = { response: { status: 200, ok: true }, data: { ok: true } };
        const refreshResponse = { status: 200, ok: true } as Response;
        const call = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
        authControllerRefresh.mockResolvedValue({ response: refreshResponse, data: { accessToken: 'new' } });

        const result = await ApiClientFactory.fetchProtected(call);

        expect(call).toHaveBeenCalledTimes(2);
        expect(authControllerRefresh).toHaveBeenCalledTimes(1);
        expect(AuthUtils.applyToCookieStore).toHaveBeenCalledWith(refreshResponse);
        expect(result).toBe(second);
    });

    it('does not retry when refresh fails', async () => {
        const unauthorized = { response: { status: 401, ok: false } };
        const call = jest.fn().mockResolvedValue(unauthorized);
        authControllerRefresh.mockResolvedValue({ response: { status: 401, ok: false }, error: { message: 'nope' } });

        const result = await ApiClientFactory.fetchProtected(call);

        expect(call).toHaveBeenCalledTimes(1);
        expect(AuthUtils.applyToCookieStore).not.toHaveBeenCalled();
        expect(result).toBe(unauthorized);
    });
});
