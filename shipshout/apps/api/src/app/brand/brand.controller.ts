import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { UpdateBrandSchema } from '@shipshout/contracts';
import { BrandService } from './brand.service';

@Controller('workspaces/:workspaceId/brand')
@UseGuards(WorkspaceGuard)
export class BrandController {
  constructor(private svc: BrandService) {}

  @Get()
  get(@Param('workspaceId') ws: string) {
    return this.svc.get(ws);
  }

  @Put()
  put(@Param('workspaceId') ws: string, @Body() body: unknown) {
    const parsed = UpdateBrandSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.upsert(ws, parsed.data);
  }
}
