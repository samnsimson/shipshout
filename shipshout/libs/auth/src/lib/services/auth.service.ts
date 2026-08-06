import { Injectable } from '@nestjs/common';
import { AuthTokenType, IdentityProvider, MembershipRole, User } from '@shipshout/database';
import { UserRepository } from '../repositories/user.repository';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { MembershipRepository } from '../repositories/membership.repository';
import { UserIdentityRepository } from '../repositories/user-identity.repository';
import { AuthTokenRepository } from '../repositories/auth-token.repository';
import { AuthError, normalizeEmail } from '../utils/auth-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export type OAuthProfile = {
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
};

function slugify(s: string) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
    constructor(
        private users: UserRepository,
        private identities: UserIdentityRepository,
        private tokens: AuthTokenRepository,
        private workspaces: WorkspaceRepository,
        private memberships: MembershipRepository,
    ) {}

    async upsertFromOAuth(provider: IdentityProvider, profile: OAuthProfile): Promise<User> {
        const existing = await this.identities.findByProvider(provider, profile.providerUserId);
        if (existing) {
            await this.updateUserProfile(existing.user, profile);
            return existing.user;
        }
        const user = await this.users.save(
            this.users.create({
                email: profile.email ? normalizeEmail(profile.email) : undefined,
                emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
                name: profile.name,
                avatarUrl: profile.avatarUrl,
            }),
        );
        await this.identities.save(
            this.identities.create({
                userId: user.id,
                provider,
                providerUserId: profile.providerUserId,
            }),
        );
        await this.bootstrapWorkspace(user, profile.name);
        return user;
    }

    /** @deprecated use upsertFromOAuth(IdentityProvider.Github, profile) */
    async upsertFromGithub(profile: {
        id: string;
        username?: string;
        emails?: { value: string }[];
        photos?: { value: string }[];
    }) {
        return this.upsertFromOAuth(IdentityProvider.Github, {
            providerUserId: String(profile.id),
            name: profile.username,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            emailVerified: !!profile.emails?.[0]?.value,
        });
    }

    async registerWithEmail(input: { email: string; password: string; name?: string }) {
        const email = normalizeEmail(input.email);
        if (await this.users.findByEmail(email)) throw new AuthError('EMAIL_EXISTS');
        if (await this.identities.findByProvider(IdentityProvider.Credentials, email))
            throw new AuthError('EMAIL_EXISTS');
        const user = await this.users.save(
            this.users.create({
                email,
                name: input.name,
            }),
        );
        await this.identities.save(
            this.identities.create({
                userId: user.id,
                provider: IdentityProvider.Credentials,
                providerUserId: email,
                passwordHash: await hashPassword(input.password),
            }),
        );
        await this.bootstrapWorkspace(user, input.name ?? email.split('@')[0]);
        const { raw } = await this.tokens.createToken(
            user.id,
            AuthTokenType.EmailVerify,
            new Date(Date.now() + VERIFY_TTL_MS),
        );
        return { user, rawVerifyToken: raw };
    }

    async validateCredentials(email: string, password: string): Promise<User> {
        const normalized = normalizeEmail(email);
        const identity = await this.identities.findByProvider(IdentityProvider.Credentials, normalized);
        if (!identity?.passwordHash || !(await verifyPassword(password, identity.passwordHash)))
            throw new AuthError('INVALID_CREDENTIALS');
        if (!identity.user.emailVerifiedAt) throw new AuthError('EMAIL_NOT_VERIFIED');
        return identity.user;
    }

    async verifyEmail(rawToken: string): Promise<User> {
        const user = await this.tokens.consumeByRawToken(AuthTokenType.EmailVerify, rawToken);
        if (!user) throw new AuthError('INVALID_TOKEN');
        user.emailVerifiedAt = new Date();
        return this.users.save(user);
    }

    async createPasswordResetToken(email: string): Promise<string | null> {
        const normalized = normalizeEmail(email);
        const identity = await this.identities.findByProvider(IdentityProvider.Credentials, normalized);
        if (!identity) return null;
        const { raw } = await this.tokens.createToken(
            identity.userId,
            AuthTokenType.PasswordReset,
            new Date(Date.now() + RESET_TTL_MS),
        );
        return raw;
    }

    async resetPassword(rawToken: string, password: string): Promise<void> {
        const user = await this.tokens.consumeByRawToken(AuthTokenType.PasswordReset, rawToken);
        if (!user) throw new AuthError('INVALID_TOKEN');
        const identity = await this.identities.findForUserProvider(user.id, IdentityProvider.Credentials);
        if (!identity) throw new AuthError('INVALID_TOKEN');
        identity.passwordHash = await hashPassword(password);
        await this.identities.save(identity);
    }

    async resendVerificationEmail(email: string): Promise<string | null> {
        const user = await this.users.findByEmail(email);
        if (!user || user.emailVerifiedAt) return null;
        const { raw } = await this.tokens.createToken(
            user.id,
            AuthTokenType.EmailVerify,
            new Date(Date.now() + VERIFY_TTL_MS),
        );
        return raw;
    }

    async linkOAuthIdentity(userId: string, provider: IdentityProvider, profile: OAuthProfile): Promise<void> {
        const existing = await this.identities.findByProvider(provider, profile.providerUserId);
        if (existing && existing.userId !== userId) throw new AuthError('IDENTITY_TAKEN');
        if (existing?.userId === userId) return;
        if (await this.identities.findForUserProvider(userId, provider)) throw new AuthError('IDENTITY_TAKEN');
        await this.identities.save(
            this.identities.create({
                userId,
                provider,
                providerUserId: profile.providerUserId,
            }),
        );
        const user = await this.users.findOneByOrFail({ id: userId });
        await this.updateUserProfile(user, profile);
    }

    async linkCredentialsIdentity(userId: string, email: string, password: string): Promise<void> {
        const normalized = normalizeEmail(email);
        const user = await this.users.findOneByOrFail({ id: userId });
        if (!user.emailVerifiedAt) throw new AuthError('EMAIL_NOT_VERIFIED');
        const taken = await this.identities.findByProvider(IdentityProvider.Credentials, normalized);
        if (taken && taken.userId !== userId) throw new AuthError('IDENTITY_TAKEN');
        if (await this.identities.findForUserProvider(userId, IdentityProvider.Credentials)) {
            const identity = await this.identities.findForUserProvider(userId, IdentityProvider.Credentials);
            identity!.passwordHash = await hashPassword(password);
            await this.identities.save(identity!);
            return;
        }
        await this.identities.save(
            this.identities.create({
                userId,
                provider: IdentityProvider.Credentials,
                providerUserId: normalized,
                passwordHash: await hashPassword(password),
            }),
        );
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const identity = await this.identities.findForUserProvider(userId, IdentityProvider.Credentials);
        if (!identity?.passwordHash || !(await verifyPassword(currentPassword, identity.passwordHash)))
            throw new AuthError('INVALID_CREDENTIALS');
        identity.passwordHash = await hashPassword(newPassword);
        await this.identities.save(identity);
    }

    async unlinkIdentity(userId: string, provider: IdentityProvider): Promise<void> {
        const count = await this.identities.countByUserId(userId);
        if (count <= 1) throw new AuthError('LAST_IDENTITY');
        const identity = await this.identities.findForUserProvider(userId, provider);
        if (!identity) throw new AuthError('IDENTITY_NOT_FOUND');
        await this.identities.remove(identity);
    }

    async listIdentities(userId: string) {
        const rows = await this.identities.listByUserId(userId);
        return rows.map((r) => ({ provider: r.provider, providerUserId: r.providerUserId }));
    }

    private async bootstrapWorkspace(user: User, name?: string) {
        const label = name ?? user.email?.split('@')[0] ?? 'My';
        const ws = await this.workspaces.save(
            this.workspaces.create({
                name: `${label} Workspace`,
                slug: slugify(`${label}-${user.id.slice(0, 6)}`),
            }),
        );
        await this.memberships.save(this.memberships.create({ user, workspace: ws, role: MembershipRole.Owner }));
    }

    private async updateUserProfile(user: User, profile: OAuthProfile) {
        if (profile.name) user.name = profile.name;
        if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
        if (profile.email && !user.email) user.email = normalizeEmail(profile.email);
        if (profile.emailVerified && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
        await this.users.save(user);
    }
}
