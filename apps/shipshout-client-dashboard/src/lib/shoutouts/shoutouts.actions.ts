'use server';

import { revalidatePath } from 'next/cache';
import { ShipshoutApi } from '@/lib/shipshout.api';
import type { ShoutoutDetailDto, ShoutoutStatusResponseDto } from './shoutouts.api';

export class ShoutoutsActions {
    static async updateDraft(
        shoutoutId: string,
        channelKey: string,
        draft: { title: string; body: string },
    ): Promise<{ ok: true; shoutout: ShoutoutDetailDto } | { ok: false; error: string }> {
        const response = await ShipshoutApi.fetch(`/shoutouts/${shoutoutId}/drafts/${channelKey}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draft),
        });

        if (!response.ok) return { ok: false, error: await ShoutoutsActions.readErrorMessage(response) };

        const shoutout = (await response.json()) as ShoutoutDetailDto;
        revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
        return { ok: true, shoutout };
    }

    static async publish(shoutoutId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
        const response = await ShipshoutApi.fetch(`/shoutouts/${shoutoutId}/publish`, { method: 'POST' });

        if (!response.ok) return { ok: false, error: await ShoutoutsActions.readErrorMessage(response) };

        const body = (await response.json()) as ShoutoutStatusResponseDto;
        revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
        revalidatePath('/dashboard/shoutouts');
        return { ok: true, status: body.status };
    }

    static async retryGeneration(shoutoutId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
        const response = await ShipshoutApi.fetch(`/shoutouts/${shoutoutId}/retry-generation`, { method: 'POST' });

        if (!response.ok) return { ok: false, error: await ShoutoutsActions.readErrorMessage(response) };

        const body = (await response.json()) as ShoutoutStatusResponseDto;
        revalidatePath(`/dashboard/shoutouts/${shoutoutId}`);
        revalidatePath('/dashboard/shoutouts');
        return { ok: true, status: body.status };
    }

    private static async readErrorMessage(response: Response): Promise<string> {
        const body = await response.json().catch(() => null);
        if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') return body.message;
        return 'Request failed';
    }
}
