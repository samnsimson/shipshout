export class ShoutoutQueueUtils {
    static generationJobId(shoutoutId: string): string {
        return `gen-${shoutoutId}`;
    }

    static dispatchJobId(shoutoutId: string): string {
        return `dispatch-${shoutoutId}`;
    }
}
