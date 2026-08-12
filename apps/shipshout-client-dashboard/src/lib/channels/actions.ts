'use server';

import { revalidatePath } from 'next/cache';
import { getShipshoutRequestOptions } from '../shipshout-api';
import type { PatchRepositoryChannelDto } from './api';

export async function updateRepositoryChannelsAction(
    repositoryId: string,
    channels: PatchRepositoryChannelDto[],
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}/repositories/${repositoryId}/channels`, {
        method: 'PATCH',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channels }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'Failed to save channels';
        return { ok: false, error: message };
    }

    revalidatePath(`/dashboard/repositories/${repositoryId}`);
    return { ok: true };
}
