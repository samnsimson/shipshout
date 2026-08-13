'use server';

import { revalidatePath } from 'next/cache';
import { ApiErrorUtils } from '@/lib/api/api-error.utils';
import type { ShoutoutDetailDto } from './shoutouts.api';
import { ShoutoutsApi } from './shoutouts.api';

export async function updateDraft(
    shoutoutId: string,
    channelKey: string,
    draft: { title: string; body: string },
): Promise<{ ok: true; shoutout: ShoutoutDetailDto } | { ok: false; error: string }> {
    const result = await ShoutoutsApi.updateDraft(shoutoutId, channelKey, draft);
    if (result.error || !result.response?.ok) return { ok: false, error: ApiErrorUtils.message(result.error, 'Request failed') };

    revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
    return { ok: true, shoutout: result.data as ShoutoutDetailDto };
}

export async function publish(shoutoutId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
    const result = await ShoutoutsApi.publish(shoutoutId);
    if (result.error || !result.response?.ok) return { ok: false, error: ApiErrorUtils.message(result.error, 'Request failed') };

    revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
    revalidatePath('/dashboard/shoutouts');
    return { ok: true, status: result.data?.status ?? 'unknown' };
}

export async function retryGeneration(shoutoutId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
    const result = await ShoutoutsApi.retryGeneration(shoutoutId);
    if (result.error || !result.response?.ok) return { ok: false, error: ApiErrorUtils.message(result.error, 'Request failed') };

    revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
    revalidatePath('/dashboard/shoutouts');
    return { ok: true, status: result.data?.status ?? 'unknown' };
}
