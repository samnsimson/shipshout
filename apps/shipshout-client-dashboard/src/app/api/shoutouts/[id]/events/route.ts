import { getShipshoutRequestOptions } from '@/lib/shipshout-api';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}/shoutouts/${id}/events`, { headers, cache: 'no-store' });
    if (!response.ok || !response.body) return new Response(null, { status: response.status });
    return new Response(response.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
