import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';
import { BrandProfileRepository } from './brand-profile.repository';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [BrandController],
    providers: [BrandProfileRepository, BrandService],
})
export class BrandModule {}
