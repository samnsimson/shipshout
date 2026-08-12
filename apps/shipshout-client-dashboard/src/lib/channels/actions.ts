'use server';

import { revalidatePath } from 'next/cache';
import { getChannelsApi } from './api';
import type { PatchRepositoryChannelDto } from './api';

export async function updateRepositoryChannelsAction(
    repositoryId: string,
    channels: PatchRepositoryChannelDto[],
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { api, requestOptions } = await getChannelsApi();
    const result = await api.updateRepositoryChannels({
        ...requestOptions,
        path: { id: repositoryId },
        body: { channels },
    });

    if (result.error || !result.response?.ok) {
        const body = result.error;
        const message =
            body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
                ? body.message
                : 'Failed to save channels';
        return { ok: false, error: message };
    }

    revalidatePath(`/dashboard/repositories/${repositoryId}`);
    revalidatePath('/dashboard/channels');
    for (const patch of channels) revalidatePath(`/dashboard/channels/${patch.channelKey}`);
    return { ok: true };
}
