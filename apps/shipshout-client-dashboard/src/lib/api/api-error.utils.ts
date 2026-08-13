export class ApiErrorUtils {
    static message(error: unknown, fallback: string): string {
        if (error && typeof error === 'object' && 'message' in error) {
            const message = (error as { message?: unknown }).message;
            if (typeof message === 'string' && message) return message;
            if (Array.isArray(message) && message.length > 0) return message.join('; ');
        }
        return fallback;
    }
}
