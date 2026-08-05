import { WorkspaceGuard } from './workspace.guard';

const ctx = (user: any, workspaceId: string) =>
    ({
        switchToHttp: () => ({ getRequest: () => ({ user, params: { workspaceId } }) }),
    }) as any;

describe('WorkspaceGuard', () => {
    it('denies when user has no membership in workspace', async () => {
        const memberships = { findForUserInWorkspace: jest.fn(async () => null) };
        const guard = new WorkspaceGuard(memberships as any);
        await expect(guard.canActivate(ctx({ id: 'u1' }, 'w1'))).resolves.toBe(false);
    });

    it('allows and attaches membership when member', async () => {
        const membership = { id: 'm1', role: 'owner' };
        const memberships = { findForUserInWorkspace: jest.fn(async () => membership) };
        const guard = new WorkspaceGuard(memberships as any);
        const req: any = { user: { id: 'u1' }, params: { workspaceId: 'w1' } };
        const c: any = { switchToHttp: () => ({ getRequest: () => req }) };
        await expect(guard.canActivate(c)).resolves.toBe(true);
        expect(req.workspaceMembership).toBe(membership);
    });
});
