import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Workspace, Membership, MembershipRole } from '@shipshout/data-entities';
import { CreateWorkspaceDto } from '@shipshout/contracts';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Injectable()
export class WorkspacesService {
  constructor(
    private workspaces: Repository<Workspace>,
    private memberships: Repository<Membership>,
  ) {}

  async listForUser(userId: string): Promise<Workspace[]> {
    const ms = await this.memberships.find({ where: { user: { id: userId } } });
    return ms.map((m) => m.workspace);
  }

  async createForUser(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const ws = await this.workspaces.save(
      this.workspaces.create({
        name: dto.name,
        slug: slugify(`${dto.name}-${Date.now().toString(36)}`),
      }),
    );
    await this.memberships.save(
      this.memberships.create({
        user: { id: userId } as Membership['user'],
        workspace: ws,
        role: MembershipRole.Owner,
      }),
    );
    return ws;
  }
}
