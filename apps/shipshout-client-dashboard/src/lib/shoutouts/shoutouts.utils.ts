export type ShoutoutStatus =
    | 'generating'
    | 'ready_for_review'
    | 'publishing'
    | 'published'
    | 'partially_published'
    | 'failed'
    | 'generation_failed';

export class ShoutoutsUtils {
    static isInFlight(status: string): boolean {
        return status === 'generating' || status === 'publishing';
    }

    static badge(status: string): { label: string; palette: 'purple' | 'blue' | 'orange' | 'green' | 'red' | 'gray' } {
        if (status === 'generating') return { label: 'Generating', palette: 'purple' };
        if (status === 'ready_for_review') return { label: 'Ready for review', palette: 'blue' };
        if (status === 'publishing') return { label: 'Publishing', palette: 'orange' };
        if (status === 'published') return { label: 'Published', palette: 'green' };
        if (status === 'partially_published') return { label: 'Partially published', palette: 'orange' };
        if (status === 'generation_failed') return { label: 'Generation failed', palette: 'red' };
        if (status === 'failed') return { label: 'Failed', palette: 'red' };
        return { label: status, palette: 'gray' };
    }
}
