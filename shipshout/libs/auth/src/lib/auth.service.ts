import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@shipshout/database';
import { UserRepository } from './repositories/user.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { MembershipRepository } from './repositories/membership.repository';

function slugify(s: string) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

@Injectable()
export class AuthService {
    constructor(
        private users: UserRepository,
        private workspaces: WorkspaceRepository,
        private memberships: MembershipRepository,
    ) {}

    async upsertFromGithub(profile: { id: string; username?: string; emails?: { value: string }[]; photos?: { value: string }[] }) {
        let user = await this.users.findByGithubId(String(profile.id));
        if (user) return user;
        user = await this.users.save(
            this.users.create({
                githubId: String(profile.id),
                name: profile.username,
                email: profile.emails?.[0]?.value,
                avatarUrl: profile.photos?.[0]?.value,
            }),
        );
        const ws = await this.workspaces.save(
            this.workspaces.create({
                name: `${profile.username ?? 'My'} Workspace`,
                slug: slugify(`${profile.username ?? 'ws'}-${user.id.slice(0, 6)}`),
            }),
        );
        await this.memberships.save(this.memberships.create({ user, workspace: ws, role: MembershipRole.Owner }));
        return user;
    }
}
