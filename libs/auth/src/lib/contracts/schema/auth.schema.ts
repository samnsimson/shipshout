import { z } from 'zod';

export const authOptionsSchema = z.object({
    baseUrl: z.string().optional(),
    secret: z.string().optional(),
    databaseUrl: z.string(),
    googleClientId: z.string().optional(),
    googleClientSecret: z.string().optional(),
    githubClientId: z.string().optional(),
    githubClientSecret: z.string().optional(),
});
