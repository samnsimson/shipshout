import { ENTITIES } from '../typeorm.config';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';
import { Membership, MembershipRole } from './membership.entity';

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
