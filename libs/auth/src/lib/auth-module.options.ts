import { AuthOptions } from './contracts/types/auth.types';

export type AuthModuleOptions = AuthOptions & {
    useFactory: (...args: unknown[]) => Promise<AuthModuleOptions>;
};
