import { cookies } from 'next/headers';
import { ApiClient } from '../../api.client';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

const authControllerRefresh = jest.fn();
const cookieStoreSet = jest.fn();

jest.mock('../client/sdk.gen', () => ({
    ApiSdk: jest.fn().mockImplementation(() => ({
        authControllerRefresh: (...args: unknown[]) => authControllerRefresh(...args),
    })),
}));

jest.mock('../client/client/client.gen', () => ({
    createClient: jest.fn(() => ({
        interceptors: { request: { use: jest.fn() } },
    })),
}));

jest.mock('../client/client/utils.gen', () => ({
    createConfig: jest.fn((config: unknown) => config),
}));

jest.mock('../../hey-api.config', () => ({
    createClientConfig: jest.fn((config: unknown) => config),
    HeyApiConfigUtils: {
        normalizeBaseUrl: (url: string) => url.replace(/\/$/, ''),
    },
}));

describe('ApiClient.buildRequestHeaders', () => {
    beforeEach(() => {
        process.env.CLIENT_APP_URL = 'http://localhost:3000';
        jest.mocked(cookies).mockReset();
        cookieStoreSet.mockReset();
    });

    it('includes Cookie, origin, and referer when cookies exist', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [{ name: 'auth_token', value: 'jwt.access' }],
            set: cookieStoreSet,
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ApiClient.buildRequestHeaders();

        expect(headers.Cookie).toBe('auth_token=jwt.access');
        expect(headers.origin).toBe('http://localhost:3000');
        expect(headers.referer).toBe('http://localhost:3000/');
    });

    it('omits Cookie when cookie store is empty', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [],
            set: cookieStoreSet,
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ApiClient.buildRequestHeaders();

        expect(headers.Cookie).toBeUndefined();
        expect(headers.origin).toBe('http://localhost:3000');
    });

    it('merges extra headers', async () => {
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [],
            set: cookieStoreSet,
        } as Awaited<ReturnType<typeof cookies>>);

        const headers = await ApiClient.buildRequestHeaders({ 'content-type': 'application/json' });

        expect(headers['content-type']).toBe('application/json');
    });
});

describe('ApiClient.fetchProtected', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SHIPSHOUT_API_URL = 'http://localhost:8000';
        jest.mocked(cookies).mockResolvedValue({
            getAll: () => [{ name: 'auth_token', value: 'old' }],
            set: cookieStoreSet,
        } as Awaited<ReturnType<typeof cookies>>);
    });

    it('retries once after a successful refresh on 401', async () => {
        const first = { response: { status: 401, ok: false } };
        const second = { response: { status: 200, ok: true }, data: { ok: true } };
        const refreshResponse = {
            status: 200,
            ok: true,
            headers: {
                getSetCookie: () => ['auth_token=new; Path=/; HttpOnly'],
                get: () => null,
            },
        } as unknown as Response;
        const call = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
        authControllerRefresh.mockResolvedValue({ response: refreshResponse, data: { accessToken: 'new' } });

        const result = await ApiClient.fetchProtected(call);

        expect(call).toHaveBeenCalledTimes(2);
        expect(authControllerRefresh).toHaveBeenCalledTimes(1);
        expect(cookieStoreSet).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'auth_token',
                value: 'new',
                path: '/',
                httpOnly: true,
            }),
        );
        expect(result).toBe(second);
    });

    it('does not retry when refresh fails', async () => {
        const unauthorized = { response: { status: 401, ok: false } };
        const call = jest.fn().mockResolvedValue(unauthorized);
        authControllerRefresh.mockResolvedValue({ response: { status: 401, ok: false }, error: { message: 'nope' } });

        const result = await ApiClient.fetchProtected(call);

        expect(call).toHaveBeenCalledTimes(1);
        expect(cookieStoreSet).not.toHaveBeenCalled();
        expect(result).toBe(unauthorized);
    });
});
