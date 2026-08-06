import { z } from 'zod';

export const RegisterRepoSchema = z.object({
    provider: z.enum(['github', 'linear', 'jira']),
    externalId: z.string().min(1),
    name: z.string().min(1),
});
export type RegisterRepoDto = z.infer<typeof RegisterRepoSchema>;

export const SimulateReleaseSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    notes: z.string().max(5000).optional(),
});
export type SimulateReleaseDto = z.infer<typeof SimulateReleaseSchema>;
