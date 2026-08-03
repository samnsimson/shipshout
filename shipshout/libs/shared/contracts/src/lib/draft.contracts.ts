import { z } from 'zod';

export const UpdateDraftSchema = z.object({
  editedCopy: z.string().min(1).max(5000),
});
export type UpdateDraftDto = z.infer<typeof UpdateDraftSchema>;
