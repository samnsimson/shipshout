import { ShoutoutsApi } from '@/lib/shoutouts/shoutouts.api';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const result = await ShoutoutsApi.streamEvents(id);
    if (!result.response?.ok || !result.data) return new Response(null, { status: result.response?.status ?? 500 });
    return new Response(result.data as ReadableStream<Uint8Array>, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
