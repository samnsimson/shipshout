import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@shipshout/database';
import { CreateWorkspaceDto } from '../dtos/create-workspace.dto';
import { MembershipRepository, WorkspaceRepository } from '../repositories/workspace.repository';

function slugify(s: string) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

@Injectable()
export class WorkspacesService {
    constructor(
        private workspaces: WorkspaceRepository,
        private memberships: MembershipRepository,
    ) {}

    async listForUser(userId: string) {
        const ms = await this.memberships.findForUser(userId);
        return ms.map((m) => m.workspace);
    }

    async createForUser(userId: string, dto: CreateWorkspaceDto) {
        const ws = await this.workspaces.save(
            this.workspaces.create({
                name: dto.name,
                slug: slugify(`${dto.name}-${Date.now().toString(36)}`),
            }),
        );
        await this.memberships.save(
            this.memberships.create({
                user: { id: userId },
                workspace: ws,
                role: MembershipRole.Owner,
            }),
        );
        return ws;
    }
}
