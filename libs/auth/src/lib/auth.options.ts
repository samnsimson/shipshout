/* eslint-disable @typescript-eslint/no-explicit-any */
import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { AuthOptions } from './contracts/types/auth.types';

export type { AuthOptions };

export interface AuthModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    useFactory: (...args: any[]) => AuthOptions | Promise<AuthOptions>;
}
