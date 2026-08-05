import { z } from 'zod';

export const UpdateBrandSchema = z.object({
    tone: z.enum(['dev_focused', 'professional', 'hype_startup']),
    customInstructions: z.string().max(1000).optional(),
    emojiPolicy: z.boolean(),
});
export type UpdateBrandDto = z.infer<typeof UpdateBrandSchema>;
