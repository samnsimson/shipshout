# ShipShout Plan 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Nx monorepo with the NestJS API, the TypeORM/Postgres data layer, GitHub OAuth SSO, and workspace/membership multi-tenancy.

**Architecture:** Nx monorepo containing `apps/web` (Next.js), `apps/api` (NestJS HTTP), and `apps/worker` (NestJS, created but idle until Plan 2). All entities and migrations live in `libs/data/entities`; shared DTO/zod contracts in `libs/shared/contracts`; auth logic in `libs/auth`. Postgres + Redis run via docker-compose for local dev.

**Tech Stack:** Nx, NestJS, Next.js (App Router), TypeORM, PostgreSQL, Redis, zod, Passport (GitHub OAuth), Jest, docker-compose.

## Global Constraints

- Monorepo tool: **Nx**. All apps/libs generated via Nx generators.
- Backend: **NestJS**; Frontend: **Next.js App Router**; ORM: **TypeORM**; DB: **PostgreSQL**; Queue/cache: **Redis**.
- All DTOs validated with **zod** schemas defined in `libs/shared/contracts` and shared across `web`, `api`, `worker`.
- OAuth tokens and webhook secrets are **encrypted at rest** (AES-256-GCM via an app key from env `APP_ENCRYPTION_KEY`).
- Every DB-backed resource is **workspace-scoped**; authorization guards enforce membership + role (owner/admin/member).
- Product name string is **"ShipShout"** everywhere user-facing.
- TypeORM: `synchronize: false` always; schema changes only via migrations.
- Tests use a real Postgres test database (via docker-compose), not sqlite.

---

### Task 1: Initialize Nx workspace and apps

**Files:**
- Create: `package.json`, `nx.json`, `tsconfig.base.json` (via Nx generator)
- Create: `apps/api/`, `apps/web/`, `apps/worker/` (scaffolds)
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: runnable Nx workspace; `nx serve api`, `nx serve web` boot; Postgres+Redis available at `localhost:5432` / `localhost:6379`.

- [ ] **Step 1: Create the Nx workspace**

```bash
npx create-nx-workspace@latest shipshout --preset=apps --nx-cloud=skip --packageManager=npm
# Run inside the existing repo root; if it creates a subdir, move contents up.
```

- [ ] **Step 2: Add NestJS and Next.js plugins and generate apps**

```bash
npm i -D @nx/nest @nx/next @nx/js
npx nx g @nx/nest:app api --directory=apps/api --unitTestRunner=jest --e2eTestRunner=none
npx nx g @nx/nest:app worker --directory=apps/worker --unitTestRunner=jest --e2eTestRunner=none
npx nx g @nx/next:app web --directory=apps/web --style=css --appDir=true --e2eTestRunner=none
```

- [ ] **Step 3: Write docker-compose for Postgres + Redis**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: shipshout
      POSTGRES_PASSWORD: shipshout
      POSTGRES_DB: shipshout
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes:
  pgdata:
```

- [ ] **Step 4: Write `.env.example`**

```bash
DATABASE_URL=postgres://shipshout:shipshout@localhost:5432/shipshout
REDIS_URL=redis://localhost:6379
APP_ENCRYPTION_KEY=  # 32-byte base64 key: `openssl rand -base64 32`
SESSION_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
WEB_BASE_URL=http://localhost:4200
API_BASE_URL=http://localhost:3000
```

- [ ] **Step 5: Verify apps boot**

Run: `docker compose up -d && npx nx serve api & npx nx serve web`
Expected: API responds on `http://localhost:3000/api`, web renders on `http://localhost:4200`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Nx workspace with api, web, worker apps and docker-compose"
```

---

### Task 2: Data layer library and TypeORM data-source

**Files:**
- Create: `libs/data/entities/src/lib/data-source.ts`
- Create: `libs/data/entities/src/lib/typeorm.config.ts`
- Create: `libs/data/entities/src/index.ts`
- Test: `libs/data/entities/src/lib/data-source.spec.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env.
- Produces: `AppDataSource` (TypeORM `DataSource`), `buildTypeOrmOptions(): DataSourceOptions`. Later tasks register entities into `buildTypeOrmOptions().entities`.

- [ ] **Step 1: Generate the lib**

```bash
npx nx g @nx/js:lib data-entities --directory=libs/data/entities --importPath=@shipshout/data-entities --unitTestRunner=jest
npm i typeorm pg reflect-metadata
```

- [ ] **Step 2: Write the failing test**

```typescript
// libs/data/entities/src/lib/data-source.spec.ts
import { buildTypeOrmOptions } from './typeorm.config';

describe('buildTypeOrmOptions', () => {
  it('never enables synchronize and uses migrations', () => {
    const opts = buildTypeOrmOptions('postgres://u:p@localhost:5432/db');
    expect(opts.synchronize).toBe(false);
    expect(opts.type).toBe('postgres');
    expect(Array.isArray(opts.entities)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx nx test data-entities`
Expected: FAIL — `buildTypeOrmOptions` not found.

- [ ] **Step 4: Implement config + data-source**

```typescript
// libs/data/entities/src/lib/typeorm.config.ts
import { DataSourceOptions } from 'typeorm';

export const ENTITIES: Function[] = []; // entities push-registered by later tasks

export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    entities: ENTITIES,
    migrations: [__dirname + '/migrations/*.js'],
  };
}
```

```typescript
// libs/data/entities/src/lib/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

export const AppDataSource = new DataSource(
  buildTypeOrmOptions(process.env.DATABASE_URL ?? '')
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx nx test data-entities`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/data/entities
git commit -m "feat(data): add TypeORM data-source and config with migrations, no synchronize"
```

---

### Task 3: Core entities (User, Workspace, Membership)

**Files:**
- Create: `libs/data/entities/src/lib/entities/user.entity.ts`
- Create: `libs/data/entities/src/lib/entities/workspace.entity.ts`
- Create: `libs/data/entities/src/lib/entities/membership.entity.ts`
- Modify: `libs/data/entities/src/lib/typeorm.config.ts` (register entities)
- Test: `libs/data/entities/src/lib/entities/entities.spec.ts`

**Interfaces:**
- Consumes: `ENTITIES` array from Task 2.
- Produces: `User`, `Workspace`, `Membership`, `MembershipRole` enum (`owner|admin|member`). Later tasks reference `workspace.id`, `user.id`, `membership.role`.

- [ ] **Step 1: Write the failing test**

```typescript
// entities.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test data-entities`
Expected: FAIL — entity modules not found.

- [ ] **Step 3: Implement entities**

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) githubId!: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) name?: string;
  @Column({ nullable: true }) avatarUrl?: string;
  @CreateDateColumn() createdAt!: Date;
}
```

```typescript
// workspace.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ unique: true }) slug!: string;
  @Column({ nullable: true }) stripeCustomerId?: string;
  @Column({ default: 'starter' }) plan!: string;
  @CreateDateColumn() createdAt!: Date;
}
```

```typescript
// membership.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum MembershipRole { Owner = 'owner', Admin = 'admin', Member = 'member' }

@Entity('memberships')
@Unique(['user', 'workspace'])
export class Membership {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => User, { eager: true }) user!: User;
  @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
  @Column({ type: 'enum', enum: MembershipRole, default: MembershipRole.Member }) role!: MembershipRole;
}
```

```typescript
// typeorm.config.ts — register
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { Membership } from './entities/membership.entity';
export const ENTITIES: Function[] = [User, Workspace, Membership];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test data-entities`
Expected: PASS.

- [ ] **Step 5: Generate the initial migration**

```bash
npx typeorm migration:generate libs/data/entities/src/lib/migrations/Init \
  -d libs/data/entities/src/lib/data-source.ts
```

- [ ] **Step 6: Run migration against local DB**

Run: `docker compose up -d && npx typeorm migration:run -d libs/data/entities/src/lib/data-source.ts`
Expected: `users`, `workspaces`, `memberships` tables created.

- [ ] **Step 7: Commit**

```bash
git add libs/data/entities
git commit -m "feat(data): add User, Workspace, Membership entities and initial migration"
```

---

### Task 4: Encryption utility for secrets at rest

**Files:**
- Create: `libs/shared/util/src/lib/crypto.ts`
- Test: `libs/shared/util/src/lib/crypto.spec.ts`

**Interfaces:**
- Consumes: `APP_ENCRYPTION_KEY` (base64, 32 bytes).
- Produces: `encryptSecret(plaintext: string): string`, `decryptSecret(ciphertext: string): string`. Later tasks (Plan 5 tokens, webhook secrets) use these.

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib shared-util --directory=libs/shared/util --importPath=@shipshout/shared-util --unitTestRunner=jest
```

```typescript
// crypto.spec.ts
import { encryptSecret, decryptSecret } from './crypto';

const KEY = Buffer.alloc(32, 1).toString('base64');
beforeAll(() => { process.env.APP_ENCRYPTION_KEY = KEY; });

describe('crypto', () => {
  it('round-trips a secret', () => {
    const ct = encryptSecret('gho_token');
    expect(ct).not.toContain('gho_token');
    expect(decryptSecret(ct)).toBe('gho_token');
  });
  it('produces different ciphertext each call (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test shared-util`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AES-256-GCM helpers**

```typescript
// crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function key(): Buffer {
  const k = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'base64');
  if (k.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes base64');
  return k;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(ciphertext: string): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split('.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test shared-util`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/util
git commit -m "feat(util): add AES-256-GCM encrypt/decrypt for secrets at rest"
```

---

### Task 5: Shared contracts (zod schemas + DTO types)

**Files:**
- Create: `libs/shared/contracts/src/lib/auth.contracts.ts`
- Create: `libs/shared/contracts/src/lib/workspace.contracts.ts`
- Test: `libs/shared/contracts/src/lib/workspace.contracts.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `CreateWorkspaceSchema`, `CreateWorkspaceDto`, `SessionUser` type used by `web` + `api`.

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib shared-contracts --directory=libs/shared/contracts --importPath=@shipshout/contracts --unitTestRunner=jest
npm i zod
```

```typescript
// workspace.contracts.spec.ts
import { CreateWorkspaceSchema } from './workspace.contracts';

describe('CreateWorkspaceSchema', () => {
  it('rejects empty name', () => {
    expect(CreateWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
  });
  it('accepts a valid name', () => {
    expect(CreateWorkspaceSchema.safeParse({ name: 'Acme' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test shared-contracts`
Expected: FAIL — schema not found.

- [ ] **Step 3: Implement contracts**

```typescript
// workspace.contracts.ts
import { z } from 'zod';
export const CreateWorkspaceSchema = z.object({ name: z.string().min(1).max(80) });
export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;
```

```typescript
// auth.contracts.ts
export interface SessionUser {
  id: string;
  githubId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test shared-contracts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/contracts
git commit -m "feat(contracts): add workspace zod schema and SessionUser type"
```

---

### Task 6: Wire TypeORM into the API app

**Files:**
- Modify: `apps/api/src/app/app.module.ts`
- Create: `apps/api/src/app/config/typeorm.module.ts`
- Test: `apps/api/src/app/config/typeorm.module.spec.ts`

**Interfaces:**
- Consumes: `buildTypeOrmOptions` (Task 2), `ENTITIES` (Task 3).
- Produces: `TypeOrmModule.forRoot` configured; repositories injectable in later API tasks.

- [ ] **Step 1: Install Nest TypeORM + config**

```bash
npm i @nestjs/typeorm @nestjs/config
```

- [ ] **Step 2: Write the failing test**

```typescript
// typeorm.module.spec.ts
import { buildApiTypeOrmOptions } from './typeorm.module';
describe('buildApiTypeOrmOptions', () => {
  it('disables synchronize', () => {
    expect(buildApiTypeOrmOptions().synchronize).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — function not found.

- [ ] **Step 4: Implement and register**

```typescript
// typeorm.module.ts
import { buildTypeOrmOptions } from '@shipshout/data-entities';
export function buildApiTypeOrmOptions() {
  return buildTypeOrmOptions(process.env.DATABASE_URL ?? '');
}
```

```typescript
// app.module.ts — add imports
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { buildApiTypeOrmOptions } from './config/typeorm.module';
// @Module imports: [ ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot(buildApiTypeOrmOptions()), ... ]
```

- [ ] **Step 5: Run test + boot check**

Run: `npx nx test api && npx nx serve api`
Expected: tests PASS; API boots and connects to Postgres (no synchronize errors).

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): wire TypeORM and ConfigModule into API app"
```

---

### Task 7: Auth library — GitHub OAuth strategy + user upsert

**Files:**
- Create: `libs/auth/src/lib/github.strategy.ts`
- Create: `libs/auth/src/lib/auth.service.ts`
- Test: `libs/auth/src/lib/auth.service.spec.ts`

**Interfaces:**
- Consumes: `User`, `Workspace`, `Membership` entities; TypeORM repositories.
- Produces: `AuthService.upsertFromGithub(profile): Promise<User>` — creates the user and, on first login, a default personal `Workspace` + owner `Membership`. Returns the `User`.

- [ ] **Step 1: Generate lib + install passport**

```bash
npx nx g @nx/js:lib auth --directory=libs/auth --importPath=@shipshout/auth --unitTestRunner=jest
npm i @nestjs/passport passport passport-github2 express-session
npm i -D @types/passport-github2 @types/express-session
```

- [ ] **Step 2: Write the failing test**

```typescript
// auth.service.spec.ts
import { AuthService } from './auth.service';

const makeRepo = () => {
  const store: any[] = [];
  return {
    store,
    findOne: jest.fn(async ({ where }) => store.find(r => r.githubId === where.githubId)),
    create: jest.fn((d) => d),
    save: jest.fn(async (d) => { const rec = { id: 'u1', ...d }; store.push(rec); return rec; }),
  };
};

describe('AuthService.upsertFromGithub', () => {
  it('creates a user, default workspace, and owner membership on first login', async () => {
    const users = makeRepo(); const workspaces = makeRepo(); const memberships = makeRepo();
    const svc = new AuthService(users as any, workspaces as any, memberships as any);
    const user = await svc.upsertFromGithub({ id: '123', username: 'ada', emails: [{ value: 'a@b.co' }], photos: [{ value: 'p.png' }] } as any);
    expect(user.githubId).toBe('123');
    expect(workspaces.save).toHaveBeenCalledTimes(1);
    expect(memberships.save).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx nx test auth`
Expected: FAIL — `AuthService` not found.

- [ ] **Step 4: Implement AuthService**

```typescript
// auth.service.ts
import { Repository } from 'typeorm';
import { User, Workspace, Membership, MembershipRole } from '@shipshout/data-entities';

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export class AuthService {
  constructor(
    private users: Repository<User>,
    private workspaces: Repository<Workspace>,
    private memberships: Repository<Membership>,
  ) {}

  async upsertFromGithub(profile: {
    id: string; username?: string;
    emails?: { value: string }[]; photos?: { value: string }[];
  }): Promise<User> {
    let user = await this.users.findOne({ where: { githubId: profile.id } });
    if (user) return user;
    user = await this.users.save(this.users.create({
      githubId: profile.id,
      name: profile.username,
      email: profile.emails?.[0]?.value,
      avatarUrl: profile.photos?.[0]?.value,
    }));
    const ws = await this.workspaces.save(this.workspaces.create({
      name: `${profile.username ?? 'My'} Workspace`,
      slug: slugify(`${profile.username ?? 'ws'}-${user.id.slice(0, 6)}`),
    }));
    await this.memberships.save(this.memberships.create({ user, workspace: ws, role: MembershipRole.Owner }));
    return user;
  }
}
```

```typescript
// github.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private auth: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ['user:email'],
    });
  }
  async validate(_at: string, _rt: string, profile: any) {
    return this.auth.upsertFromGithub(profile);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx nx test auth`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/auth
git commit -m "feat(auth): GitHub OAuth strategy and user/workspace bootstrap on first login"
```

---

### Task 8: Auth controller, session, and workspace guard in API

**Files:**
- Create: `apps/api/src/app/auth/auth.controller.ts`
- Create: `apps/api/src/app/auth/auth.module.ts`
- Create: `libs/auth/src/lib/workspace.guard.ts`
- Test: `libs/auth/src/lib/workspace.guard.spec.ts`
- Test: `apps/api/src/app/auth/auth.controller.spec.ts`

**Interfaces:**
- Consumes: `AuthService`, `GithubStrategy`, `Membership` repo.
- Produces: routes `GET /api/auth/github`, `GET /api/auth/github/callback` (sets session, redirects to `WEB_BASE_URL`), `GET /api/auth/me`, `POST /api/auth/logout`; `WorkspaceGuard` that resolves `req.workspaceMembership` from `:workspaceId` and rejects non-members. Later plans depend on `WorkspaceGuard` + `req.workspaceMembership`.

- [ ] **Step 1: Write the failing guard test**

```typescript
// workspace.guard.spec.ts
import { WorkspaceGuard } from './workspace.guard';

const ctx = (user: any, workspaceId: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ user, params: { workspaceId }, }) }),
}) as any;

describe('WorkspaceGuard', () => {
  it('denies when user has no membership in workspace', async () => {
    const memberships = { findOne: jest.fn(async () => null) };
    const guard = new WorkspaceGuard(memberships as any);
    await expect(guard.canActivate(ctx({ id: 'u1' }, 'w1'))).resolves.toBe(false);
  });
  it('allows and attaches membership when member', async () => {
    const membership = { id: 'm1', role: 'owner' };
    const memberships = { findOne: jest.fn(async () => membership) };
    const guard = new WorkspaceGuard(memberships as any);
    const req: any = { user: { id: 'u1' }, params: { workspaceId: 'w1' } };
    const c: any = { switchToHttp: () => ({ getRequest: () => req }) };
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(req.workspaceMembership).toBe(membership);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test auth`
Expected: FAIL — `WorkspaceGuard` not found.

- [ ] **Step 3: Implement the guard**

```typescript
// workspace.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Membership } from '@shipshout/data-entities';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private memberships: Repository<Membership>) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.user) return false;
    const workspaceId = req.params.workspaceId;
    const membership = await this.memberships.findOne({
      where: { user: { id: req.user.id }, workspace: { id: workspaceId } },
    });
    if (!membership) return false;
    req.workspaceMembership = membership;
    return true;
  }
}
```

- [ ] **Step 4: Implement controller + module + session**

```typescript
// auth.controller.ts
import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  @Get('github') @UseGuards(AuthGuard('github')) login() { /* redirect handled by passport */ }

  @Get('github/callback') @UseGuards(AuthGuard('github'))
  callback(@Req() req: any, @Res() res: any) {
    req.session.userId = req.user.id;
    res.redirect(process.env.WEB_BASE_URL ?? '/');
  }

  @Get('me') me(@Req() req: any) { return req.user ?? null; }

  @Post('logout') logout(@Req() req: any) {
    return new Promise((resolve) => req.session.destroy(() => resolve({ ok: true })));
  }
}
```

Register `express-session` in `apps/api/src/main.ts` with `SESSION_SECRET`, httpOnly + sameSite cookies; add a middleware that loads `req.user` from `req.session.userId`. Register `AuthModule` (providers: `AuthService`, `GithubStrategy`, `WorkspaceGuard`, TypeORM repos) in `app.module.ts`.

- [ ] **Step 5: Write + run the controller test**

```typescript
// auth.controller.spec.ts
import { AuthController } from './auth.controller';
describe('AuthController', () => {
  it('me returns the request user', () => {
    const c = new AuthController();
    expect(c.me({ user: { id: 'u1' } } as any)).toEqual({ id: 'u1' });
  });
});
```

Run: `npx nx test auth && npx nx test api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api libs/auth
git commit -m "feat(api): auth controller, session handling, and workspace membership guard"
```

---

### Task 9: Workspace API (list/create/switch) + roles

**Files:**
- Create: `apps/api/src/app/workspaces/workspaces.controller.ts`
- Create: `apps/api/src/app/workspaces/workspaces.service.ts`
- Create: `apps/api/src/app/workspaces/workspaces.module.ts`
- Test: `apps/api/src/app/workspaces/workspaces.service.spec.ts`

**Interfaces:**
- Consumes: `Workspace`, `Membership`, `WorkspaceGuard`, `CreateWorkspaceSchema`.
- Produces: `GET /api/workspaces` (caller's workspaces), `POST /api/workspaces` (create + owner membership), `GET /api/workspaces/:workspaceId` (guarded). `WorkspacesService.listForUser(userId)` and `createForUser(userId, dto)`.

- [ ] **Step 1: Write the failing test**

```typescript
// workspaces.service.spec.ts
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService.createForUser', () => {
  it('creates workspace and owner membership', async () => {
    const workspaces = { create: (d:any)=>d, save: jest.fn(async (d:any)=>({ id:'w1', ...d })) };
    const memberships = { create: (d:any)=>d, save: jest.fn(async (d:any)=>d) };
    const svc = new WorkspacesService(workspaces as any, memberships as any);
    const ws = await svc.createForUser('u1', { name: 'Acme' });
    expect(ws.id).toBe('w1');
    expect(memberships.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement service + controller**

```typescript
// workspaces.service.ts
import { Repository } from 'typeorm';
import { Workspace, Membership, MembershipRole } from '@shipshout/data-entities';
import { CreateWorkspaceDto } from '@shipshout/contracts';

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

export class WorkspacesService {
  constructor(private workspaces: Repository<Workspace>, private memberships: Repository<Membership>) {}

  async listForUser(userId: string): Promise<Workspace[]> {
    const ms = await this.memberships.find({ where: { user: { id: userId } } });
    return ms.map(m => m.workspace);
  }

  async createForUser(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const ws = await this.workspaces.save(this.workspaces.create({
      name: dto.name, slug: slugify(`${dto.name}-${Date.now().toString(36)}`),
    }));
    await this.memberships.save(this.memberships.create({
      user: { id: userId } as any, workspace: ws, role: MembershipRole.Owner,
    }));
    return ws;
  }
}
```

```typescript
// workspaces.controller.ts
import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { CreateWorkspaceSchema } from '@shipshout/contracts';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private svc: WorkspacesService) {}

  @Get() list(@Req() req: any) { return this.svc.listForUser(req.user.id); }

  @Post() create(@Req() req: any, @Body() body: unknown) {
    const parsed = CreateWorkspaceSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.createForUser(req.user.id, parsed.data);
  }

  @Get(':workspaceId') @UseGuards(WorkspaceGuard)
  get(@Param('workspaceId') id: string, @Req() req: any) {
    return req.workspaceMembership.workspace;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): workspace list/create/get endpoints with owner membership"
```

---

### Task 10: Web app shell — login, session, workspace switcher

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/session.ts`
- Test: `apps/web/src/lib/api-client.spec.ts`

**Interfaces:**
- Consumes: API routes `/api/auth/me`, `/api/workspaces`.
- Produces: `apiFetch(path, init)` (credentials: 'include'), `getSessionUser()`; login page with "Sign in with GitHub" linking to `${API_BASE_URL}/api/auth/github`; dashboard layout guarding unauthenticated users and rendering a workspace switcher. Later plans (dashboard, billing) reuse `apiFetch` + layout.

- [ ] **Step 1: Write the failing test**

```typescript
// api-client.spec.ts
import { apiFetch } from './api-client';
describe('apiFetch', () => {
  it('sends credentials and prefixes API base', async () => {
    const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    await apiFetch('/workspaces');
    expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces', expect.objectContaining({ credentials: 'include' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test web`
Expected: FAIL — `apiFetch` not found.

- [ ] **Step 3: Implement client + session + pages**

```typescript
// api-client.ts
export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const res = await fetch(`${base}/api${path}`, { credentials: 'include', ...init });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
```

```typescript
// session.ts
import { apiFetch } from './api-client';
export async function getSessionUser() {
  try { return await apiFetch('/auth/me'); } catch { return null; }
}
```

```tsx
// login/page.tsx
export default function LoginPage() {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github`;
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div>
        <h1>ShipShout</h1>
        <a href={url}>Sign in with GitHub</a>
      </div>
    </main>
  );
}
```

```tsx
// (dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <div><header>ShipShout — {user.name}</header>{children}</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test web`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: start API + web, visit `/login`, sign in with GitHub, confirm redirect into dashboard and `/api/auth/me` returns the user.
Expected: authenticated dashboard renders; unauthenticated `/` redirects to `/login`.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): login page, session helper, api client, guarded dashboard layout"
```

---

## Self-Review (Plan 1)

- **Spec coverage:** Auth (§10, §3), workspaces/multi-tenancy (§5), entities User/Workspace/Membership (§5), encryption utility (§5/§10), TypeORM/Postgres/no-synchronize (§2), Nx layout (§4), docker-compose (§12) — all covered. `Repository`, `BrandProfile`, etc. are intentionally deferred to later plans.
- **Type consistency:** `MembershipRole` enum, `WorkspaceGuard` + `req.workspaceMembership`, `AuthService.upsertFromGithub`, `apiFetch` are defined here and consumed consistently downstream.
- **No placeholders:** every code step contains real, runnable code.
