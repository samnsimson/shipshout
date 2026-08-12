export type JwtUserPayload = {
    sub: string;
    email: string;
    name: string;
    username?: string | null;
    stripeCustomerId?: string | null;
};
