import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { SimulateReleaseDto } from '../dtos/simulate-release.dto';
import { WebhooksService } from '../services/webhooks.service';

@Controller('workspaces/:workspaceId/repositories')
@UseGuards(WorkspaceGuard)
export class RepositorySimulateController {
    constructor(private webhooks: WebhooksService) {}

    @Post(':id/simulate-release')
    simulateRelease(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() dto: SimulateReleaseDto) {
        return this.webhooks.simulateRelease(workspaceId, id, dto);
    }
}
