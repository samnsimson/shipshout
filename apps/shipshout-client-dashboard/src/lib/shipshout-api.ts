import { cookies } from 'next/headers';

export type ShipshoutRequestOptions = {
    baseUrl: string;
    headers: Record<string, string>;
};

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

export async function getShipshoutRequestOptions(): Promise<ShipshoutRequestOptions> {
    const baseUrl = process.env.SHIPSHOUT_API_URL;
    if (!baseUrl) throw new Error('SHIPSHOUT_API_URL is not set');

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

    return {
        baseUrl: normalizeBaseUrl(baseUrl),
        headers: { Cookie: cookieHeader },
    };
}

export async function shipshoutFetch<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: unknown; status: number }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            ...headers,
            ...(init?.headers ?? {}),
        },
        cache: 'no-store',
    });

    if (response.status === 204) return { status: response.status };

    const body = await response.json().catch(() => null);
    if (!response.ok) return { error: body, status: response.status };
    return { data: body as T, status: response.status };
}
