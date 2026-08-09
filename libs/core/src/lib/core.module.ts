import { Global, Module } from '@nestjs/common';
import { LoggerMiddleware } from './middlewares/logger.middleware';

@Global()
@Module({
    providers: [LoggerMiddleware],
    exports: [LoggerMiddleware],
})
export class CoreModule {}
