import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { MembershipRepository } from './repositories/membership.repository.js';

@Injectable()
export class WorkspaceGuard implements CanActivate {
    constructor(private memberships: MembershipRepository) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        if (!req.user) return false;
        const workspaceId = req.params.workspaceId;
        const membership = await this.memberships.findForUserInWorkspace(req.user.id, workspaceId);
        if (!membership) return false;
        req.workspaceMembership = membership;
        return true;
    }
}
