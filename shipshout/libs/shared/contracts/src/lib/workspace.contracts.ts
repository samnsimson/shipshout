import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
    name: z.string().min(1).max(80),
});
export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;
