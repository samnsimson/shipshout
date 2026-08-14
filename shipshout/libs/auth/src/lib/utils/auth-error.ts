export class AuthError extends Error {
    constructor(
        public code: string,
        message?: string,
    ) {
        super(message ?? code);
    }
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
