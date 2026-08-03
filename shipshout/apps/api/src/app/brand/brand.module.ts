import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';
import { BrandProfileRepository } from './brand-profile.repository';

@Module({
    imports: [AuthModule],
    controllers: [BrandController],
    providers: [BrandProfileRepository, BrandService],
})
export class BrandModule {}
