import { z } from 'zod';
import { authOptionsSchema } from '../schema/auth.schema';

export type AuthOptions = z.infer<typeof authOptionsSchema>;
