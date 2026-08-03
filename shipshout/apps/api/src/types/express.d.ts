import type { Membership } from '@shipshout/data-entities';
import type { User } from '@shipshout/data-entities';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      user?: User;
      workspaceMembership?: Membership;
    }
  }
}

export {};
