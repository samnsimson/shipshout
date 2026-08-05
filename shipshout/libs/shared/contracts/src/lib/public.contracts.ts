import { z } from 'zod';

export const PublicTweetSchema = z.object({ releaseNotes: z.string().min(1).max(4000) });
export type PublicTweetDto = z.infer<typeof PublicTweetSchema>;
