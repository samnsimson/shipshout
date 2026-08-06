import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { SimulateReleaseSchema } from '@shipshout/contracts';
import { WebhooksService } from './webhooks.service';

@Controller('workspaces/:workspaceId/repositories')
@UseGuards(WorkspaceGuard)
export class RepositorySimulateController {
    constructor(private webhooks: WebhooksService) {}

    @Post(':id/simulate-release')
    simulateRelease(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() body: unknown) {
        const parsed = SimulateReleaseSchema.safeParse(body ?? {});
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        return this.webhooks.simulateRelease(workspaceId, id, parsed.data);
    }
}
