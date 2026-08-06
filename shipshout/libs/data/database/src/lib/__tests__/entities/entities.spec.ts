import { ENTITIES } from '../../config/typeorm.config.js';
import { User } from '../../entities/user.entity.js';
import { Workspace } from '../../entities/workspace.entity.js';
import { Membership, MembershipRole } from '../../entities/membership.entity.js';

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
