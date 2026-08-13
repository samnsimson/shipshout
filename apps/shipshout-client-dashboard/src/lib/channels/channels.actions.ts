'use server';

import { revalidatePath } from 'next/cache';
import { ShipshoutApi } from '@/lib/shipshout.api';
import { ChannelsApi } from './channels.api';
import type { PatchRepositoryChannelDto } from './channels.api';

export class ChannelsActions {
    static async updateRepositoryChannels(
        repositoryId: string,
        channels: PatchRepositoryChannelDto[],
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        const result = await ChannelsApi.updateRepositoryChannels(repositoryId, channels);
        if (result.error || !result.response?.ok) return { ok: false, error: ShipshoutApi.errorMessage(result.error, 'Failed to save channels') };

        revalidatePath(`/dashboard/repositories/${repositoryId}`);
        revalidatePath('/dashboard/channels');
        for (const patch of channels) revalidatePath(`/dashboard/channels/${patch.channelKey}`);
        return { ok: true };
    }
}
