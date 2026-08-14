# Credentials & Google OAuth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password sign-up (with verification + password reset) and Google OAuth login to ShipShout, with multi-provider account linking, while keeping GitHub login and repo-connect flows unchanged.

**Architecture:** Introduce `user_identities` and `auth_tokens` tables; migrate `githubId` off `users`. Refactor `AuthService` to a generic identity model shared by GitHub, Google, and credentials Passport strategies. Session model stays `express-session` + `session.userId`. Platform Resend sends verify/reset emails.

**Tech Stack:** TypeORM migrations, NestJS + Passport, bcrypt, `@shipshout/shared-util` RateLimiter, Next.js/Chakra UI v3, Nx (`bunx nx test auth`, `bun run migration:run`).

**Design spec:** `docs/superpowers/specs/2026-08-06-credentials-google-oauth-design.md`

## Global Constraints

- Session model unchanged: successful auth sets `req.session.userId`; repo connect uses `session.githubRepoConnect` only.
- GitHub repo-connect `state=repo:{workspaceId}` on `/auth/github/callback` must remain unchanged.
- Credentials sign-up: **no session** until email verified; login returns `403 { code: 'EMAIL_NOT_VERIFIED' }` if unverified.
- Passwords: bcrypt cost factor **12**; minimum length **8** characters.
- Auth tokens: crypto-random raw token, stored as **SHA-256 hash**; verify TTL **24h**, reset TTL **1h**; single-use.
- Rate limit: **5 req/min per IP** on register, login, forgot-password, resend-verification (use existing `RateLimiter`).
- Link OAuth state: HMAC-signed `{ userId, exp }` with `SESSION_SECRET`; **10 minute** expiry.
- Cannot unlink last remaining identity (`400 LAST_IDENTITY`).
- No silent auto-merge by email — explicit link only.
- Auth emails use platform `RESEND_API_KEY` + `AUTH_EMAIL_FROM` (not workspace Resend keys).
- Run migrations after entity changes: `bun run migration:gen` then `bun run migration:run`.
- Commit after each task when tests pass.

---

## File Structure

| File | Responsibility |
|---|---|
| `libs/data/database/src/lib/entities/user-identity.entity.ts` | Provider linkage + optional password hash |
| `libs/data/database/src/lib/entities/auth-token.entity.ts` | Verify/reset tokens |
| `libs/data/database/src/lib/entities/user.entity.ts` | Profile shell; drop `githubId`, add `emailVerifiedAt` |
| `libs/auth/src/lib/repositories/user-identity.repository.ts` | Find by provider, list by user |
| `libs/auth/src/lib/repositories/auth-token.repository.ts` | Create/consume tokens |
| `libs/auth/src/lib/utils/password.ts` | bcrypt hash/verify |
| `libs/auth/src/lib/utils/token-hash.ts` | SHA-256 token hashing |
| `libs/auth/src/lib/utils/link-state.ts` | HMAC sign/verify link state |
| `libs/auth/src/lib/services/auth.service.ts` | Register, OAuth upsert, link/unlink, verify, reset |
| `libs/auth/src/lib/strategies/google.strategy.ts` | Google Passport strategy |
| `libs/auth/src/lib/strategies/local.strategy.ts` | Email/password Passport strategy |
| `apps/api/src/app/auth/services/auth-mail.service.ts` | Resend verify/reset emails |
| `apps/api/src/app/auth/controllers/auth.controller.ts` | All auth HTTP routes |
| `apps/api/src/app/auth/controllers/google-oauth-callback.controller.ts` | Google callback (login + link) |
| `apps/api/src/app/repositories/controllers/github-oauth-callback.controller.ts` | Add link-state branch |
| `apps/web/src/components/auth/login-form.tsx` | Multi-method login |
| `apps/web/src/components/auth/signup-form.tsx` | Registration form |
| `apps/web/src/app/signup/page.tsx` | Sign-up page |
| `apps/web/src/app/check-email/page.tsx` | Post-register confirmation |
| `apps/web/src/app/forgot-password/page.tsx` | Forgot password |
| `apps/web/src/app/reset-password/page.tsx` | Reset password form |
| `apps/web/src/app/(dashboard)/[workspaceId]/settings/account/page.tsx` | Connected accounts |

---

### Task 1: Add auth dependencies

**Files:**
- Modify: `package.json` (root)
- Modify: `libs/auth/package.json`

**Interfaces:**
- Produces: packages `bcrypt`, `passport-google-oauth20`, `passport-local`, `@types/bcrypt`, `@types/passport-google-oauth20`, `@types/passport-local`

- [ ] **Step 1: Install packages**

```bash
cd shipshout
bun add bcrypt passport-google-oauth20 passport-local
bun add -d @types/bcrypt @types/passport-google-oauth20 @types/passport-local
```

- [ ] **Step 2: Add peer deps to libs/auth/package.json**

```json
"bcrypt": "workspace:*",
"passport-google-oauth20": "workspace:*",
"passport-local": "workspace:*"
```

(use versions from root lockfile after install)

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock libs/auth/package.json
git commit -m "chore: add bcrypt and passport google/local strategies"
```

---

### Task 2: Database entities and migration

**Files:**
- Create: `libs/data/database/src/lib/entities/user-identity.entity.ts`
- Create: `libs/data/database/src/lib/entities/auth-token.entity.ts`
- Modify: `libs/data/database/src/lib/entities/user.entity.ts`
- Modify: `libs/data/database/src/lib/config/typeorm.config.ts`
- Modify: `libs/data/database/src/index.ts`
- Modify: `libs/data/database/src/lib/config/migration-classes.ts`
- Create: migration via `bun run migration:gen`

**Interfaces:**
- Produces: `IdentityProvider` enum `'github' | 'google' | 'credentials'`
- Produces: `AuthTokenType` enum `'email_verify' | 'password_reset'`
- Produces: `UserIdentity`, `AuthToken` entities
- Produces: `User.emailVerifiedAt?: Date`; `User.githubId` removed

- [ ] **Step 1: Add enums and entities**

```typescript
// user-identity.entity.ts
export enum IdentityProvider {
    Github = 'github',
    Google = 'google',
    Credentials = 'credentials',
}

@Entity('user_identities')
@Unique(['provider', 'providerUserId'])
@Unique(['userId', 'provider'])
export class UserIdentity {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => User, { onDelete: 'CASCADE' }) user!: User;
    @Column() userId!: string;
    @Column({ type: 'enum', enum: IdentityProvider }) provider!: IdentityProvider;
    @Column() providerUserId!: string;
    @Column({ nullable: true }) passwordHash?: string;
    @CreateDateColumn() createdAt!: Date;
}
```

```typescript
// auth-token.entity.ts
export enum AuthTokenType {
    EmailVerify = 'email_verify',
    PasswordReset = 'password_reset',
}

@Entity('auth_tokens')
export class AuthToken {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => User, { onDelete: 'CASCADE' }) user!: User;
    @Column() userId!: string;
    @Column({ type: 'enum', enum: AuthTokenType }) type!: AuthTokenType;
    @Column() tokenHash!: string;
    @Column() expiresAt!: Date;
    @Column({ nullable: true }) usedAt?: Date;
    @CreateDateColumn() createdAt!: Date;
}
```

```typescript
// user.entity.ts — replace githubId with:
@Column({ nullable: true, unique: true }) email?: string;
@Column({ nullable: true }) emailVerifiedAt?: Date;
// remove githubId column
```

- [ ] **Step 2: Register entities in typeorm.config.ts and export from index.ts**

- [ ] **Step 3: Generate migration with backfill SQL**

Run: `bun run migration:gen -- libs/data/database/src/lib/migrations/UserIdentities`

Edit generated migration to include data backfill before dropping column:

```sql
INSERT INTO user_identities ("userId", provider, "providerUserId", "createdAt")
SELECT id, 'github', "githubId", "createdAt" FROM users;

UPDATE users SET "emailVerifiedAt" = "createdAt";

ALTER TABLE users DROP COLUMN "githubId";
```

- [ ] **Step 4: Register migration in migration-classes.ts and run**

Run: `bun run migration:run`  
Expected: migration applies cleanly

- [ ] **Step 5: Commit**

```bash
git add libs/data/database
git commit -m "feat(database): add user identities and auth tokens"
```

---

### Task 3: Identity and auth-token repositories

**Files:**
- Create: `libs/auth/src/lib/repositories/user-identity.repository.ts`
- Create: `libs/auth/src/lib/repositories/auth-token.repository.ts`
- Modify: `libs/auth/src/lib/repositories/user.repository.ts`
- Modify: `libs/auth/src/index.ts`

**Interfaces:**
- Produces: `UserIdentityRepository.findByProvider(provider, providerUserId): Promise<UserIdentity | null>`
- Produces: `UserIdentityRepository.listByUserId(userId): Promise<UserIdentity[]>`
- Produces: `UserIdentityRepository.countByUserId(userId): Promise<number>`
- Produces: `UserRepository.findByEmail(email): Promise<User | null>` (normalized lowercase)
- Produces: `AuthTokenRepository.createToken(userId, type, rawToken, expiresAt): Promise<AuthToken>`
- Produces: `AuthTokenRepository.consumeByRawToken(type, rawToken): Promise<User | null>` — returns user if valid, null if expired/used/missing

- [ ] **Step 1: Write failing tests**

```typescript
// libs/auth/src/lib/__tests__/repositories/auth-token.repository.spec.ts
it('consumeByRawToken marks token used and returns user', async () => {
    const raw = 'abc123';
    const hash = sha256(raw);
    // mock repo with token row expiresAt in future, usedAt null
    const user = await repo.consumeByRawToken(AuthTokenType.EmailVerify, raw);
    expect(user?.id).toBe('u1');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ usedAt: expect.any(Date) }));
});
```

- [ ] **Step 2: Implement repositories**

Remove `findByGithubId` from `UserRepository`; add `findByEmail`.

- [ ] **Step 3: Export from libs/auth/src/index.ts**

- [ ] **Step 4: Run tests**

Run: `bunx nx test auth --testPathPatterns=auth-token`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/auth
git commit -m "feat(auth): add identity and auth-token repositories"
```

---

### Task 4: Password, token hash, and link-state utilities

**Files:**
- Create: `libs/auth/src/lib/utils/password.ts`
- Create: `libs/auth/src/lib/utils/token-hash.ts`
- Create: `libs/auth/src/lib/utils/link-state.ts`
- Test: `libs/auth/src/lib/__tests__/utils/password.spec.ts`
- Test: `libs/auth/src/lib/__tests__/utils/link-state.spec.ts`

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>`
- Produces: `verifyPassword(plain: string, hash: string): Promise<boolean>`
- Produces: `hashToken(raw: string): string` — SHA-256 hex
- Produces: `signLinkState(userId: string, secret: string): string` — base64url payload.sig
- Produces: `verifyLinkState(token: string, secret: string): { userId: string } | null`

- [ ] **Step 1: Write failing tests**

```typescript
it('hashPassword verifies correctly', async () => {
    const hash = await hashPassword('secret1234');
    expect(await verifyPassword('secret1234', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
});

it('verifyLinkState rejects expired token', () => {
    const token = signLinkState('u1', 'secret', { expOffsetSec: -60 });
    expect(verifyLinkState(token, 'secret')).toBeNull();
});
```

- [ ] **Step 2: Implement utilities**

Use bcrypt cost 12. Link state payload: `{ userId, exp: unixSeconds }` signed with HMAC-SHA256.

- [ ] **Step 3: Run tests**

Run: `bunx nx test auth --testPathPatterns=utils`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/auth/src/lib/utils libs/auth/src/lib/__tests__/utils
git commit -m "feat(auth): add password, token hash, and link-state utilities"
```

---

### Task 5: Refactor AuthService — OAuth upsert (GitHub + Google)

**Files:**
- Modify: `libs/auth/src/lib/services/auth.service.ts`
- Modify: `libs/auth/src/lib/__tests__/services/auth.service.spec.ts`
- Modify: `libs/auth/src/lib/strategies/github.strategy.ts`

**Interfaces:**
- Produces: `AuthService.upsertFromOAuth(provider: IdentityProvider, profile: OAuthProfile): Promise<User>`
- Produces: `OAuthProfile { providerUserId: string; email?: string; name?: string; avatarUrl?: string; emailVerified?: boolean }`
- Consumes: `UserIdentityRepository`, `UserRepository` from Task 3
- Side effect: new user → default workspace + owner membership (same as today)

- [ ] **Step 1: Update failing test — replace upsertFromGithub assertion**

```typescript
it('upsertFromOAuth creates user, github identity, workspace, and membership on first login', async () => {
    const identities = makeIdentityRepo();
    const users = makeUserRepo();
    const svc = new AuthService(users, identities, workspaces, memberships, tokens);
    const user = await svc.upsertFromOAuth(IdentityProvider.Github, {
        providerUserId: '123',
        name: 'ada',
        email: 'a@b.co',
        emailVerified: true,
    });
    expect(identities.save).toHaveBeenCalledWith(expect.objectContaining({
        provider: IdentityProvider.Github,
        providerUserId: '123',
    }));
    expect(workspaces.save).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Implement upsertFromOAuth**

```typescript
async upsertFromOAuth(provider: IdentityProvider, profile: OAuthProfile): Promise<User> {
    const existing = await this.identities.findByProvider(provider, profile.providerUserId);
    if (existing) return existing.user;
    const user = await this.users.save(this.users.create({
        email: profile.email?.toLowerCase(),
        emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
    }));
    await this.identities.save(this.identities.create({
        userId: user.id,
        provider,
        providerUserId: profile.providerUserId,
    }));
    await this.bootstrapWorkspace(user, profile.name);
    return user;
}
```

Extract `bootstrapWorkspace(user, name)` from existing slugify logic.

- [ ] **Step 3: Update GithubStrategy validate**

```typescript
async validate(_at: string, _rt: string, profile: { id: string; username?: string; emails?: { value: string }[]; photos?: { value: string }[] }) {
    return this.auth.upsertFromOAuth(IdentityProvider.Github, {
        providerUserId: String(profile.id),
        name: profile.username,
        email: profile.emails?.[0]?.value,
        avatarUrl: profile.photos?.[0]?.value,
        emailVerified: !!profile.emails?.[0]?.value,
    });
}
```

- [ ] **Step 4: Run tests**

Run: `bunx nx test auth --testPathPatterns=auth.service`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/auth
git commit -m "feat(auth): refactor OAuth upsert to user identities model"
```

---

### Task 6: AuthService — credentials register, login, verify, reset

**Files:**
- Modify: `libs/auth/src/lib/services/auth.service.ts`
- Modify: `libs/auth/src/lib/__tests__/services/auth.service.spec.ts`

**Interfaces:**
- Produces: `AuthService.registerWithEmail(input: { email: string; password: string; name?: string }): Promise<{ user: User; rawVerifyToken: string }>`
- Produces: `AuthService.validateCredentials(email: string, password: string): Promise<User>` — throws `EMAIL_NOT_VERIFIED` or `INVALID_CREDENTIALS`
- Produces: `AuthService.verifyEmail(rawToken: string): Promise<User>`
- Produces: `AuthService.createPasswordResetToken(email: string): Promise<string | null>` — raw token or null (no enumeration)
- Produces: `AuthService.resetPassword(rawToken: string, password: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

```typescript
it('registerWithEmail creates unverified user and credentials identity', async () => {
    const result = await svc.registerWithEmail({ email: 'a@b.co', password: 'password12', name: 'Ada' });
    expect(result.user.emailVerifiedAt).toBeUndefined();
    expect(tokens.createToken).toHaveBeenCalledWith(result.user.id, AuthTokenType.EmailVerify, expect.any(String), expect.any(Date));
});

it('validateCredentials throws EMAIL_NOT_VERIFIED when unverified', async () => {
    await expect(svc.validateCredentials('a@b.co', 'password12')).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
});

it('verifyEmail sets emailVerifiedAt', async () => {
    const user = await svc.verifyEmail('raw-token');
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
});
```

- [ ] **Step 2: Implement methods**

Normalize email to lowercase. On register: reject duplicate email or existing credentials identity with `EMAIL_EXISTS`. Hash password via `hashPassword`. Verify token via `AuthTokenRepository.consumeByRawToken`.

Define `AuthError` class with `code` field for API mapping.

- [ ] **Step 3: Run tests**

Run: `bunx nx test auth --testPathPatterns=auth.service`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/auth
git commit -m "feat(auth): add credentials register, login, verify, and reset"
```

---

### Task 7: AuthService — link and unlink identities

**Files:**
- Modify: `libs/auth/src/lib/services/auth.service.ts`
- Modify: `libs/auth/src/lib/__tests__/services/auth.service.spec.ts`

**Interfaces:**
- Produces: `AuthService.linkOAuthIdentity(userId: string, provider: IdentityProvider, profile: OAuthProfile): Promise<void>` — throws `IDENTITY_TAKEN`
- Produces: `AuthService.linkCredentialsIdentity(userId: string, email: string, password: string): Promise<void>`
- Produces: `AuthService.unlinkIdentity(userId: string, provider: IdentityProvider): Promise<void>` — throws `LAST_IDENTITY`
- Produces: `AuthService.listIdentities(userId: string): Promise<{ provider: IdentityProvider; providerUserId: string }[]>`

- [ ] **Step 1: Write failing tests**

```typescript
it('unlinkIdentity throws LAST_IDENTITY when only one remains', async () => {
    identities.countByUserId.mockResolvedValue(1);
    await expect(svc.unlinkIdentity('u1', IdentityProvider.Github)).rejects.toMatchObject({ code: 'LAST_IDENTITY' });
});

it('linkOAuthIdentity throws IDENTITY_TAKEN when provider account belongs to another user', async () => {
    identities.findByProvider.mockResolvedValue({ userId: 'other' });
    await expect(svc.linkOAuthIdentity('u1', IdentityProvider.Google, { providerUserId: 'g1' })).rejects.toMatchObject({ code: 'IDENTITY_TAKEN' });
});
```

- [ ] **Step 2: Implement link/unlink/list**

- [ ] **Step 3: Run tests**

Run: `bunx nx test auth`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/auth
git commit -m "feat(auth): add identity link and unlink"
```

---

### Task 8: Google and Local Passport strategies

**Files:**
- Create: `libs/auth/src/lib/strategies/google.strategy.ts`
- Create: `libs/auth/src/lib/strategies/local.strategy.ts`
- Modify: `libs/auth/src/index.ts`

**Interfaces:**
- Produces: `GoogleStrategy` name `'google'` — calls `upsertFromOAuth(IdentityProvider.Google, ...)`
- Produces: `LocalStrategy` name `'local'` — calls `validateCredentials(email, password)`; maps `EMAIL_NOT_VERIFIED` to Passport failure with code

- [ ] **Step 1: Implement GoogleStrategy**

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private auth: AuthService) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL!,
            scope: ['profile', 'email'],
        });
    }
    async validate(_at: string, _rt: string, profile: Profile) {
        return this.auth.upsertFromOAuth(IdentityProvider.Google, {
            providerUserId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
            emailVerified: profile.emails?.[0]?.verified ?? true,
        });
    }
}
```

- [ ] **Step 2: Implement LocalStrategy**

Use `usernameField: 'email'`, `passwordField: 'password'`. Custom `passReqToCallback: false`.

- [ ] **Step 3: Export strategies from libs/auth index**

- [ ] **Step 4: Commit**

```bash
git add libs/auth
git commit -m "feat(auth): add Google and local Passport strategies"
```

---

### Task 9: AuthMailService (platform Resend)

**Files:**
- Create: `apps/api/src/app/auth/services/auth-mail.service.ts`
- Create: `apps/api/src/app/auth/__tests__/services/auth-mail.service.spec.ts`

**Interfaces:**
- Produces: `AuthMailService.sendVerificationEmail(to: string, rawToken: string): Promise<void>`
- Produces: `AuthMailService.sendPasswordResetEmail(to: string, rawToken: string): Promise<void>`
- Uses: `process.env.RESEND_API_KEY`, `process.env.AUTH_EMAIL_FROM`, `process.env.API_BASE_URL`, `process.env.WEB_BASE_URL`

- [ ] **Step 1: Write failing test with mocked fetch**

```typescript
it('sendVerificationEmail posts to Resend with verify link', async () => {
    global.fetch = jest.fn(async () => ({ ok: true })) as any;
    await svc.sendVerificationEmail('a@b.co', 'tok');
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }),
    }));
});
```

- [ ] **Step 2: Implement service**

Verify link: `{API_BASE_URL}/api/auth/verify-email?token={raw}`  
Reset link: `{WEB_BASE_URL}/reset-password?token={raw}`

Skip send (no throw) when `RESEND_API_KEY` unset — log warning (dev convenience).

- [ ] **Step 3: Run tests**

Run: `bunx nx test api --testPathPatterns=auth-mail`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/auth
git commit -m "feat(api): add AuthMailService for verify and reset emails"
```

---

### Task 10: Credentials auth routes + rate limiting

**Files:**
- Modify: `apps/api/src/app/auth/controllers/auth.controller.ts`
- Create: `apps/api/src/app/auth/dto/register.dto.ts`
- Create: `apps/api/src/app/auth/dto/login.dto.ts`
- Create: `apps/api/src/app/auth/dto/email.dto.ts`
- Create: `apps/api/src/app/auth/dto/reset-password.dto.ts`
- Modify: `apps/api/src/app/auth/auth.module.ts`
- Modify: `apps/api/src/app/auth/__tests__/controllers/auth.controller.spec.ts`

**Interfaces:**
- Consumes: `AuthService.registerWithEmail`, `validateCredentials`, `verifyEmail`, `createPasswordResetToken`, `resetPassword` from Task 6
- Consumes: `AuthMailService` from Task 9
- Consumes: `RateLimiter` from `@shipshout/shared-util` (5 req / 60s, key `auth:{ip}:{route}`)
- Produces: routes per spec §4.3 credentials table

- [ ] **Step 1: Write failing controller tests**

```typescript
it('register returns 201 without setting session', async () => {
    auth.registerWithEmail.mockResolvedValue({ user: { id: 'u1' }, rawVerifyToken: 't' });
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.co', password: 'password12' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
});
```

- [ ] **Step 2: Implement DTOs with class-validator**

```typescript
export class RegisterDto {
    @IsEmail() email!: string;
    @MinLength(8) password!: string;
    @IsOptional() @IsString() name?: string;
}
```

- [ ] **Step 3: Implement routes**

```typescript
@Post('register')
async register(@Req() req: Request, @Body() dto: RegisterDto) {
    await this.rateLimit(req, 'register');
    const { user, rawVerifyToken } = await this.auth.registerWithEmail(dto);
    await this.mail.sendVerificationEmail(user.email!, rawVerifyToken);
    return { ok: true };
}

@Post('login')
@UseGuards(AuthGuard('local'))
login(@Req() req: Request) {
    req.session.userId = req.user!.id;
    return new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve({ ok: true }))));
}
```

Add `@UseGuards` exception filter mapping `EMAIL_NOT_VERIFIED` → 403.

`GET /auth/verify-email` — consume token, redirect `{WEB}/login?verified=1`.

- [ ] **Step 4: Wire AuthModule providers**

Add `GoogleStrategy`, `LocalStrategy`, `UserIdentityRepository`, `AuthTokenRepository`, `AuthMailService`, `RateLimiter` provider.

- [ ] **Step 5: Run tests**

Run: `bunx nx test api --testPathPatterns=auth.controller`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/auth
git commit -m "feat(api): add credentials auth routes with rate limiting"
```

---

### Task 11: Google OAuth routes and callback

**Files:**
- Modify: `apps/api/src/app/auth/controllers/auth.controller.ts`
- Create: `apps/api/src/app/auth/controllers/google-oauth-callback.controller.ts`
- Modify: `apps/api/src/app/auth/auth.module.ts`

**Interfaces:**
- Produces: `GET /auth/google` — Passport redirect
- Produces: `GET /auth/google/callback` — login or link flow based on `state`

- [ ] **Step 1: Add Google login route to AuthController**

```typescript
@Get('google')
@UseGuards(AuthGuard('google'))
googleLogin() {}
```

- [ ] **Step 2: Implement GoogleOAuthCallbackController**

```typescript
@Get('google/callback')
async callback(@Req() req: Request, @Res() res: Response, @Query('state') state?: string) {
    const linkUserId = state?.startsWith('link:') ? verifyLinkState(state.slice(5), process.env.SESSION_SECRET!)?.userId : undefined;
    passport.authenticate('google', async (err, user) => {
        if (linkUserId && user) {
            await this.auth.linkOAuthIdentity(linkUserId, IdentityProvider.Google, /* profile from user or re-fetch */);
            return res.redirect(`${web}/${workspaceFromSession}/settings/account?linked=google`);
        }
        // login flow: session.userId = user.id; redirect WEB_BASE_URL
    })(req, res);
}
```

For link flow, pass profile from strategy via `passReqToCallback` or store in session before redirect — use signed state only for userId; identity data comes from OAuth profile in callback.

- [ ] **Step 3: Register controller in AuthModule**

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/auth
git commit -m "feat(api): add Google OAuth login and callback"
```

---

### Task 12: GitHub link state + identity management routes

**Files:**
- Modify: `apps/api/src/app/repositories/controllers/github-oauth-callback.controller.ts`
- Modify: `apps/api/src/app/auth/controllers/auth.controller.ts`

**Interfaces:**
- Produces: `GET /auth/link/github`, `GET /auth/link/google` — redirect with signed link state (requires session)
- Produces: `GET /auth/identities` — list linked providers
- Produces: `DELETE /auth/link/:provider` — unlink
- Produces: `POST /auth/link/credentials` — `{ password }` add credentials to logged-in user

- [ ] **Step 1: Add link branch to GitHub callback (before repo-connect check)**

```typescript
if (state?.startsWith('link:')) {
    const link = verifyLinkState(state.slice(5), process.env.SESSION_SECRET!);
    if (!link) return loginRedirect(res, 'link_expired');
    return passport.authenticate('github', async (err, user, info) => {
        // linkOAuthIdentity(link.userId, IdentityProvider.Github, profile)
        res.redirect(`${web}/${req.session.activeWorkspaceId ?? ''}/settings/account?linked=github`);
    })(req, res);
}
```

Store return workspace in link state or use `req.session` before OAuth redirect:

```typescript
// GET /auth/link/github
@Get('link/github')
@UseGuards(/* session required */)
linkGithub(@Req() req: Request, @Res() res: Response) {
    const token = signLinkState(req.user!.id, process.env.SESSION_SECRET!);
    // redirect to GitHub authorize with state=link:{token}
}
```

Use Passport `authenticate` with `state` option or manual authorize URL.

- [ ] **Step 2: Implement identities list, unlink, link/credentials routes**

Add simple `@Req()` session guard: `if (!req.user) throw UnauthorizedException`.

- [ ] **Step 3: Regression test — repo-connect state still works**

Run: `bunx nx test api --testPathPatterns=github-oauth-callback`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/auth apps/api/src/app/repositories/controllers/github-oauth-callback.controller.ts
git commit -m "feat(api): add identity linking routes and GitHub link callback"
```

---

### Task 13: Update E2E seed and session user types

**Files:**
- Modify: `apps/api-e2e/src/api/flow.e2e-spec.ts`
- Modify: `apps/web/src/layout/app-header.tsx`
- Modify: `apps/web/src/layout/dashboard-shell.tsx`

**Interfaces:**
- E2E user created with `UserIdentity` row instead of `githubId` on user
- Web `SessionUser` type: `{ id: string; name?: string; email?: string }` (drop `githubId` display preference)

- [ ] **Step 1: Fix E2E user bootstrap**

```typescript
const user = await ds.getRepository(User).save({ name: 'E2E', email: 'e2e@test.com', emailVerifiedAt: new Date() });
await ds.getRepository(UserIdentity).save({ userId: user.id, provider: IdentityProvider.Github, providerUserId: `e2e-${Date.now()}` });
```

- [ ] **Step 2: Update web avatar fallback to use email**

```typescript
<Avatar.Fallback name={user.name ?? user.email ?? 'User'} />
```

- [ ] **Step 3: Run E2E**

Run: `bunx nx e2e api-e2e`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api-e2e apps/web/src/layout
git commit -m "fix: update E2E and web session user for identity model"
```

---

### Task 14: Web — expanded login and signup pages

**Files:**
- Modify: `apps/web/src/components/auth/login-form.tsx`
- Create: `apps/web/src/components/auth/signup-form.tsx`
- Create: `apps/web/src/components/auth/oauth-buttons.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/signup/page.tsx`
- Create: `apps/web/src/lib/auth-api.ts`

**Interfaces:**
- Produces: `authApi.register({ email, password, name? })`, `authApi.login({ email, password })`
- OAuth buttons link to `{API}/api/auth/github` and `{API}/api/auth/google`

- [ ] **Step 1: Create oauth-buttons.tsx**

GitHub + Google buttons with divider pattern from spec §5.2.

- [ ] **Step 2: Expand login-form.tsx**

Email/password fields, form POST to `authApi.login`, handle `EMAIL_NOT_VERIFIED` with resend button calling `authApi.resendVerification(email)`.

- [ ] **Step 3: Create signup-form.tsx + signup/page.tsx**

On success redirect to `/check-email?email=...`.

- [ ] **Step 4: Update login/page.tsx**

Pass `googleAuthUrl`, show `?verified=1` and `?reset=1` banners.

- [ ] **Step 5: Manual smoke test**

Run: `bun run dev:web-api`  
Visit: `http://localhost:4200/login` and `/signup` — forms render with three auth methods.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/auth apps/web/src/app/login apps/web/src/app/signup apps/web/src/lib/auth-api.ts
git commit -m "feat(web): add multi-method login and signup pages"
```

---

### Task 15: Web — check-email, forgot-password, reset-password

**Files:**
- Create: `apps/web/src/app/check-email/page.tsx`
- Create: `apps/web/src/app/forgot-password/page.tsx`
- Create: `apps/web/src/app/reset-password/page.tsx`
- Modify: `apps/web/src/lib/auth-api.ts`

- [ ] **Step 1: Implement check-email page**

Shows email from query param; resend button → `POST /auth/resend-verification`.

- [ ] **Step 2: Implement forgot-password page**

Submit email → generic success message regardless of outcome.

- [ ] **Step 3: Implement reset-password page**

Read `token` from query; password + confirm fields → `POST /auth/reset-password` → redirect `/login?reset=1`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/check-email apps/web/src/app/forgot-password apps/web/src/app/reset-password apps/web/src/lib/auth-api.ts
git commit -m "feat(web): add check-email, forgot-password, and reset-password pages"
```

---

### Task 16: Web — Connected accounts settings

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/account/page.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/account/connected-accounts.tsx`
- Modify: `apps/web/src/layout/app-sidebar.tsx`
- Modify: `apps/web/src/lib/auth-api.ts`

**Interfaces:**
- Consumes: `GET /auth/identities`, `DELETE /auth/link/:provider`, `POST /auth/link/credentials`
- Connect buttons → `{API}/api/auth/link/github` and `{API}/api/auth/link/google`

- [ ] **Step 1: Implement connected-accounts.tsx**

Fetch identities on mount; show Connect/Disconnect/Add password per spec §5.4. Disable disconnect when `identities.length === 1`.

- [ ] **Step 2: Add sidebar nav item**

```tsx
<NavItem href={`/${ws}/settings/account`} icon={<LuUser size={20} />} showLabel={showLabels}>
    Account
</NavItem>
```

- [ ] **Step 3: Handle ?linked= query toast on page load**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/[workspaceId]/settings/account apps/web/src/layout/app-sidebar.tsx apps/web/src/lib/auth-api.ts
git commit -m "feat(web): add connected accounts settings page"
```

---

### Task 17: Environment docs and global setup

**Files:**
- Modify: `shipshout/.env.example`
- Modify: `shipshout/README.md`
- Modify: `tools/test/global-setup.ts` (add Google/Resend test env stubs if needed)

- [ ] **Step 1: Add env vars to .env.example**

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
RESEND_API_KEY=
AUTH_EMAIL_FROM=ShipShout <auth@yourdomain.com>
```

- [ ] **Step 2: Add README auth section**

Document: GitHub + Google OAuth app setup, platform Resend for auth emails, credential sign-up flow.

- [ ] **Step 3: Run full test suite**

Run: `bun run test`  
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md tools/test
git commit -m "docs: document credentials and Google OAuth auth setup"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `user_identities` + migrate `githubId` | Task 2 |
| `auth_tokens` table | Task 2 |
| `emailVerifiedAt` on users | Task 2 |
| GitHub login via identities | Task 5 |
| Google login auto-bootstrap | Task 5, 8, 11 |
| Credentials register + hard verify block | Task 6, 10 |
| Forgot/reset password | Task 6, 9, 10, 15 |
| Google OAuth routes | Task 11 |
| Link/unlink identities | Task 7, 12, 16 |
| Rate limiting 5/min | Task 10 |
| Platform Resend emails | Task 9 |
| Web login/signup/check-email/forgot/reset | Task 14, 15 |
| Connected accounts settings | Task 16 |
| Repo connect unchanged | Task 12 (regression test) |
| E2E compatibility | Task 13 |
| Env docs | Task 17 |

## Type Consistency Check

- `IdentityProvider` enum used consistently in repositories, AuthService, strategies, and API routes.
- `AuthService.upsertFromOAuth(provider, profile)` consumed by GithubStrategy, GoogleStrategy, and link flows.
- `signLinkState` / `verifyLinkState` used in GitHub callback, Google callback, and link start routes.
- `AuthMailService` receives raw tokens; only SHA-256 hashes stored via `AuthTokenRepository`.
- Web `auth-api.ts` error codes match API: `EMAIL_NOT_VERIFIED`, `EMAIL_EXISTS`, `IDENTITY_TAKEN`, `LAST_IDENTITY`.
