import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { TlsOptions } from 'tls';

export type DatabaseConnectionOptions = {
    url?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string | (() => string) | (() => Promise<string>);
    database?: string;
    ssl?: boolean | TlsOptions;
    applicationName?: string;
};

export interface DatabaseModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    /**
     * Factory args are intentionally untyped (Nest inject tokens).
     * Same pattern as TypeOrmModuleAsyncOptions.useFactory.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFactory: (...args: any[]) => DatabaseConnectionOptions | Promise<DatabaseConnectionOptions>;
}
