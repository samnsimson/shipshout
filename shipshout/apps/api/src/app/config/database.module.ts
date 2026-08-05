import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTITIES } from '@shipshout/database';

@Module({
    imports: [TypeOrmModule.forFeature(ENTITIES)],
    exports: [TypeOrmModule],
})
export class DatabaseModule {}
