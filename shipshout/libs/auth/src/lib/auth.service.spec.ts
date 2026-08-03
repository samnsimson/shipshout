import { AuthService } from './auth.service.js';

function makeRepo() {
    const store: any[] = [];
    const repo = {
        store,
        findOne: jest.fn(async ({ where }: { where: { githubId?: string; id?: string } }) =>
            store.find((r) => r.githubId === where.githubId || r.id === where.id),
        ),
        findByGithubId: jest.fn(async (githubId: string) => store.find((r) => r.githubId === githubId)),
        create: jest.fn((d: unknown) => d),
        save: jest.fn(async (d: any) => {
            const rec = { id: 'u1', ...d };
            store.push(rec);
            return rec;
        }),
    };
    return repo;
}

describe('AuthService.upsertFromGithub', () => {
    it('creates a user, default workspace, and owner membership on first login', async () => {
        const users = makeRepo();
        const workspaces = makeRepo();
        const memberships = makeRepo();
        const svc = new AuthService(users as any, workspaces as any, memberships as any);
        const user = await svc.upsertFromGithub({
            id: '123',
            username: 'ada',
            emails: [{ value: 'a@b.co' }],
            photos: [{ value: 'p.png' }],
        } as any);
        expect(user.githubId).toBe('123');
        expect(workspaces.save).toHaveBeenCalledTimes(1);
        expect(memberships.save).toHaveBeenCalledTimes(1);
    });
});
