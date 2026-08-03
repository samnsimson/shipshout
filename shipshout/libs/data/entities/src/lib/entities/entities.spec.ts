import { ENTITIES } from '../typeorm.config.js';
import { User } from './user.entity.js';
import { Workspace } from './workspace.entity.js';
import { Membership, MembershipRole } from './membership.entity.js';

describe('core entities', () => {
  it('registers all core entities', () => {
    expect(ENTITIES).toEqual(expect.arrayContaining([User, Workspace, Membership]));
  });
  it('defines membership roles', () => {
    expect(MembershipRole.Owner).toBe('owner');
    expect(MembershipRole.Admin).toBe('admin');
    expect(MembershipRole.Member).toBe('member');
  });
});
