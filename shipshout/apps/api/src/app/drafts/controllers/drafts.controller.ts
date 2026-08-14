import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { UpdateDraftDto } from '../dtos/update-draft.dto';
import { DraftsService } from '../services/drafts.service';

@Controller('workspaces/:workspaceId/drafts')
@UseGuards(WorkspaceGuard)
export class DraftsController {
    constructor(private svc: DraftsService) {}

    @Get()
    list(@Param('workspaceId') ws: string) {
        return this.svc.listForWorkspace(ws);
    }

    @Patch(':draftId')
    update(@Param('workspaceId') ws: string, @Param('draftId') id: string, @Body() dto: UpdateDraftDto) {
        return this.svc.updateCopy(ws, id, dto);
    }

    @Post(':draftId/approve')
    approve(@Param('workspaceId') ws: string, @Param('draftId') id: string) {
        return this.svc.approve(ws, id);
    }

    @Post(':draftId/publish')
    publish(@Param('workspaceId') ws: string, @Param('draftId') id: string) {
        return this.svc.publish(ws, id);
    }
}
