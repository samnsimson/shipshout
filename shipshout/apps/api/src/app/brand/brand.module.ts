import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandProfile } from '@shipshout/data-entities';
import { AuthModule } from '../auth/auth.module';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';

@Module({
  imports: [TypeOrmModule.forFeature([BrandProfile]), AuthModule],
  controllers: [BrandController],
  providers: [BrandService],
})
export class BrandModule {}
