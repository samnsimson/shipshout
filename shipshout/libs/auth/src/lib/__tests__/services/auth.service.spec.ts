import { AuthService } from '../../services/auth.service';

const IdentityProvider = {
    Github: 'github',
    Google: 'google',
    Credentials: 'credentials',
} as const;

jest.mock('@nestjs/typeorm', () => ({
    InjectRepository: () => () => undefined,
}));

jest.mock('../../utils/password', () => ({
    hashPassword: jest.fn(async (p: string) => `hash:${p}`),
    verifyPassword: jest.fn(async (p: string, h: string) => h === `hash:${p}` || p === 'password12'),
}));

function makeUserRepo() {
    const store: any[] = [];
    return {
        store,
        findOneBy: jest.fn(async ({ id }: { id: string }) => store.find((r) => r.id === id)),
        findOneByOrFail: jest.fn(async ({ id }: { id: string }) => store.find((r) => r.id === id)),
        findByEmail: jest.fn(async (email: string) => store.find((r) => r.email === email)),
        create: jest.fn((d: unknown) => d),
        save: jest.fn(async (d: any) => {
            const rec = { id: d.id ?? `u${store.length + 1}`, ...d };
            const idx = store.findIndex((r) => r.id === rec.id);
            if (idx >= 0) store[idx] = rec;
            else store.push(rec);
            return rec;
        }),
    };
}

function makeIdentityRepo() {
    const store: any[] = [];
    return {
        store,
        findByProvider: jest.fn(async (provider: IdentityProvider, providerUserId: string) => {
            const row = store.find((r) => r.provider === provider && r.providerUserId === providerUserId);
            return row ? { ...row, user: row.user ?? { id: row.userId } } : null;
        }),
        findForUserProvider: jest.fn(async (userId: string, provider: IdentityProvider) =>
            store.find((r) => r.userId === userId && r.provider === provider),
        ),
        countByUserId: jest.fn(async (userId: string) => store.filter((r) => r.userId === userId).length),
        listByUserId: jest.fn(async (userId: string) => store.filter((r) => r.userId === userId)),
        create: jest.fn((d: unknown) => d),
        save: jest.fn(async (d: any) => {
            store.push({ id: `i${store.length + 1}`, ...d });
            return d;
        }),
        remove: jest.fn(async (d: any) => {
            const idx = store.findIndex((r) => r === d);
            if (idx >= 0) store.splice(idx, 1);
        }),
    };
}

function makeTokenRepo() {
    return {
        createToken: jest.fn(async (userId: string) => ({ raw: 'verify-token', token: { userId } })),
        consumeByRawToken: jest.fn(async () => null),
    };
}

function makeSimpleRepo() {
    return {
        create: jest.fn((d: unknown) => d),
        save: jest.fn(async (d: any) => ({ id: 'x1', ...d })),
    };
}

describe('AuthService', () => {
    it('upsertFromOAuth creates user, identity, workspace, and membership on first login', async () => {
        const users = makeUserRepo();
        const identities = makeIdentityRepo();
        const workspaces = makeSimpleRepo();
        const memberships = makeSimpleRepo();
        const tokens = makeTokenRepo();
        const svc = new AuthService(users as any, identities as any, tokens as any, workspaces as any, memberships as any);
        const user = await svc.upsertFromOAuth(IdentityProvider.Github, {
            providerUserId: '123',
            name: 'ada',
            email: 'a@b.co',
            emailVerified: true,
        });
        expect(user.email).toBe('a@b.co');
        expect(identities.save).toHaveBeenCalledWith(
            expect.objectContaining({ provider: IdentityProvider.Github, providerUserId: '123' }),
        );
        expect(workspaces.save).toHaveBeenCalledTimes(1);
        expect(memberships.save).toHaveBeenCalledTimes(1);
    });

    it('registerWithEmail creates unverified user and verification token', async () => {
        const users = makeUserRepo();
        const identities = makeIdentityRepo();
        const workspaces = makeSimpleRepo();
        const memberships = makeSimpleRepo();
        const tokens = makeTokenRepo();
        const svc = new AuthService(users as any, identities as any, tokens as any, workspaces as any, memberships as any);
        const result = await svc.registerWithEmail({ email: 'a@b.co', password: 'password12', name: 'Ada' });
        expect(result.user.emailVerifiedAt).toBeUndefined();
        expect(result.rawVerifyToken).toBe('verify-token');
    });

    it('validateCredentials throws EMAIL_NOT_VERIFIED when unverified', async () => {
        const users = makeUserRepo();
        const identities = makeIdentityRepo();
        identities.findByProvider.mockResolvedValue({
            passwordHash: 'hash:password12',
            user: { id: 'u1', emailVerifiedAt: undefined },
            userId: 'u1',
        });
        const svc = new AuthService(
            users as any,
            identities as any,
            makeTokenRepo() as any,
            makeSimpleRepo() as any,
            makeSimpleRepo() as any,
        );
        await expect(svc.validateCredentials('a@b.co', 'password12')).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    });

    it('unlinkIdentity throws LAST_IDENTITY when only one remains', async () => {
        const identities = makeIdentityRepo();
        identities.countByUserId.mockResolvedValue(1);
        const svc = new AuthService(
            makeUserRepo() as any,
            identities as any,
            makeTokenRepo() as any,
            makeSimpleRepo() as any,
            makeSimpleRepo() as any,
        );
        await expect(svc.unlinkIdentity('u1', IdentityProvider.Github)).rejects.toMatchObject({ code: 'LAST_IDENTITY' });
    });
});
