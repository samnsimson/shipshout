import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { BrandController } from './controllers/brand.controller';
import { BrandService } from './services/brand.service';
import { BrandProfileRepository } from './repositories/brand-profile.repository';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [BrandController],
    providers: [BrandProfileRepository, BrandService],
})
export class BrandModule {}
