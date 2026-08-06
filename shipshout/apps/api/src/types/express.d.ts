import { Membership } from '@shipshout/database';
import { User } from '@shipshout/database';

declare module 'express-session' {
    interface SessionData {
        userId?: string;
        githubRepoConnect?: {
            workspaceId: string;
            accessToken: string;
            repos: { id: number; full_name: string }[];
        };
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
