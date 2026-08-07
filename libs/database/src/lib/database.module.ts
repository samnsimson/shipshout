import { DynamicModule } from '@nestjs/common';
import { DatabaseService } from './database.service';

export class DatabaseModule {
    static forRootAsync(): DynamicModule {
        return {
            global: true,
            module: DatabaseModule,
            providers: [DatabaseService],
        };
    }
}
