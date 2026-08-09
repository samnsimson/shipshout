import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

export class LoggerModule {
    private static instance(name: string): winston.Logger {
        return winston.createLogger({
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.ms(),
                        nestWinstonModuleUtilities.format.nestLike(name, {
                            colors: true,
                            prettyPrint: true,
                            processId: true,
                            appName: true,
                        }),
                    ),
                }),
            ],
        });
    }

    static getLogger(name: string): LoggerService {
        return WinstonModule.createLogger({
            instance: this.instance(name),
        });
    }
}
