'use server';

import { revalidatePath } from 'next/cache';
import { getShipshoutRequestOptions } from '@/lib/shipshout-api';
import type { ShoutoutDetailDto, ShoutoutStatusResponseDto } from './api';

async function readErrorMessage(response: Response): Promise<string> {
    const body = await response.json().catch(() => null);
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') return body.message;
    return 'Request failed';
}

export async function updateShoutoutDraftAction(
    shoutoutId: string,
    channelKey: string,
    draft: { title: string; body: string },
): Promise<{ ok: true; shoutout: ShoutoutDetailDto } | { ok: false; error: string }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}/shoutouts/${shoutoutId}/drafts/${channelKey}`, {
        method: 'PATCH',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
        cache: 'no-store',
    });

    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };

    const shoutout = (await response.json()) as ShoutoutDetailDto;
    revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
    return { ok: true, shoutout };
}

export async function publishShoutoutAction(shoutoutId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}/shoutouts/${shoutoutId}/publish`, {
        method: 'POST',
        headers,
        cache: 'no-store',
    });

    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };

    const body = (await response.json()) as ShoutoutStatusResponseDto;
    revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
    revalidatePath('/dashboard/shoutouts');
    return { ok: true, status: body.status };
}

export async function retryShoutoutGenerationAction(shoutoutId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}/shoutouts/${shoutoutId}/retry-generation`, {
        method: 'POST',
        headers,
        cache: 'no-store',
    });

    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };

    const body = (await response.json()) as ShoutoutStatusResponseDto;
    revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
    revalidatePath('/dashboard/shoutouts');
    return { ok: true, status: body.status };
}
