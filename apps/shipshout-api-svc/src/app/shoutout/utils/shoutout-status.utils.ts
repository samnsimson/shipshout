import { ShoutoutStatus } from '@shipshout/database';

export class ShoutoutStatusUtils {
    static canTransition(from: ShoutoutStatus, to: ShoutoutStatus): boolean {
        const allowed: Record<ShoutoutStatus, ShoutoutStatus[]> = {
            generating: ['ready_for_review', 'generation_failed'],
            ready_for_review: ['publishing'],
            publishing: ['published', 'partially_published', 'failed'],
            generation_failed: ['generating'],
            published: [],
            partially_published: [],
            failed: [],
        };
        return allowed[from]?.includes(to) ?? false;
    }
}
