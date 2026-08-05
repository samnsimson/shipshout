import { z } from 'zod';

export const RegisterRepoSchema = z.object({
    provider: z.enum(['github', 'linear', 'jira']),
    externalId: z.string().min(1),
    name: z.string().min(1),
});
export type RegisterRepoDto = z.infer<typeof RegisterRepoSchema>;
