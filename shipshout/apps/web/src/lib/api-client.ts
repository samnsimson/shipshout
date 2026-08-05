export async function apiFetch(path: string, init: RequestInit = {}) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const extraHeaders: Record<string, string> = {};
    try {
        const { headers } = await import('next/headers');
        const cookie = (await headers()).get('cookie');
        if (cookie) extraHeaders.cookie = cookie;
    } catch {
        /* not in a Next.js request context (e.g. unit tests) */
    }
    const res = await fetch(`${base}/api${path}`, {
        credentials: 'include',
        ...init,
        headers: { ...extraHeaders, ...(init.headers as Record<string, string>) },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}
