import { Repository } from 'typeorm';
import { User, Workspace, Membership, MembershipRole } from '@shipshout/data-entities';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export class AuthService {
  constructor(
    private users: Repository<User>,
    private workspaces: Repository<Workspace>,
    private memberships: Repository<Membership>,
  ) {}

  async upsertFromGithub(profile: {
    id: string;
    username?: string;
    emails?: { value: string }[];
    photos?: { value: string }[];
  }): Promise<User> {
    let user = await this.users.findOne({ where: { githubId: profile.id } });
    if (user) return user;
    user = await this.users.save(
      this.users.create({
        githubId: profile.id,
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
    await this.memberships.save(
      this.memberships.create({ user, workspace: ws, role: MembershipRole.Owner }),
    );
    return user;
  }
}
