'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import type { ShoutoutStreamEvent } from './shoutouts.api';

export class ShoutoutEventsUtils {
    static parseSseChunk(chunk: string, onEvent: (event: ShoutoutStreamEvent) => void): string {
        const parts = chunk.split('\n\n');
        const remainder = parts.pop() ?? '';

        for (const part of parts) {
            const dataLine = part
                .split('\n')
                .find((line) => line.startsWith('data:'));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload) continue;
            try {
                onEvent(JSON.parse(payload) as ShoutoutStreamEvent);
            } catch {
                // ignore malformed events
            }
        }

        return remainder;
    }
}

export function useShoutoutEvents(shoutoutId: string, enabled: boolean) {
    const router = useRouter();
    const onEvent = useCallback(() => router.refresh(), [router]);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let pollIntervalId: number | undefined;
        const controller = new AbortController();

        const startPolling = () => {
            if (pollIntervalId !== undefined) return;
            pollIntervalId = window.setInterval(() => router.refresh(), 3000);
        };

        const connect = async () => {
            try {
                const response = await fetch(`/api/shoutouts/${shoutoutId}/events`, {
                    credentials: 'include',
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) throw new Error('SSE unavailable');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (!cancelled) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    buffer = ShoutoutEventsUtils.parseSseChunk(buffer, onEvent);
                }

                if (!cancelled) startPolling();
            } catch {
                if (!cancelled) startPolling();
            }
        };

        void connect();

        return () => {
            cancelled = true;
            controller.abort();
            if (pollIntervalId !== undefined) window.clearInterval(pollIntervalId);
        };
    }, [enabled, onEvent, router, shoutoutId]);
}
