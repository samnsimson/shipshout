import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Membership } from '@shipshout/data-entities';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private memberships: Repository<Membership>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.user) return false;
    const workspaceId = req.params.workspaceId;
    const membership = await this.memberships.findOne({
      where: { user: { id: req.user.id }, workspace: { id: workspaceId } },
    });
    if (!membership) return false;
    req.workspaceMembership = membership;
    return true;
  }
}
