import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { UpdateBrandDto } from '../dtos/update-brand.dto';
import { BrandService } from '../services/brand.service';

@Controller('workspaces/:workspaceId/brand')
@UseGuards(WorkspaceGuard)
export class BrandController {
    constructor(private svc: BrandService) {}

    @Get()
    get(@Param('workspaceId') ws: string) {
        return this.svc.get(ws);
    }

    @Put()
    put(@Param('workspaceId') ws: string, @Body() dto: UpdateBrandDto) {
        return this.svc.upsert(ws, dto);
    }
}
