import { WorkspacesService } from '../../services/workspaces.service';

describe('WorkspacesService.createForUser', () => {
    it('creates workspace and owner membership', async () => {
        const workspaces = {
            create: (d: any) => d,
            save: jest.fn(async (d: any) => ({ id: 'w1', ...d })),
        };
        const memberships = {
            create: (d: any) => d,
            save: jest.fn(async (d: any) => d),
        };
        const svc = new WorkspacesService(workspaces as any, memberships as any);
        const ws = await svc.createForUser('u1', { name: 'Acme' });
        expect(ws.id).toBe('w1');
        expect(memberships.save).toHaveBeenCalled();
    });
});
